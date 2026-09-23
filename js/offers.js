"use strict";

/* =========================================================
   AL YOSRA STORE - Offers
   Pagination + Cache + Smart Sync + Infinite Scroll
   + Lazy Loading + Local Search
   ========================================================= */

window.offers = [];

const OFFERS_PAGE_SIZE = 20;
const OFFERS_CACHE_KEY = "alYosraOffersCache_v1";

const offersContainer =
    document.getElementById("offersContainer");

const offerSearchToggle =
    document.getElementById("offerSearchToggle");

const offerSearchPopover =
    document.getElementById("offerSearchPopover");

const offerSearchInput =
    document.getElementById("offerSearchInput");

let allOffers = [];

let currentPage = 0;
let isLoadingMore = false;
let hasMoreOffers = true;
let offersInitialized = false;

let imageObserver = null;
let infiniteScrollObserver = null;
let offersSentinel = null;

let offerBatchSyncObserver = null;

const syncedOfferBatches = new Set();
const syncingOfferBatches = new Set();


/* =========================================================
   CACHE
   ========================================================= */

function readOffersCache() {
    try {
        const raw =
            localStorage.getItem(
                OFFERS_CACHE_KEY
            );

        if (!raw) {
            return null;
        }

        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return null;
        }

        return parsed;

    } catch (error) {
        console.warn(
            "Offers cache read failed:",
            error
        );

        return null;
    }
}


function saveOffersCache(offers) {
    try {
        localStorage.setItem(
            OFFERS_CACHE_KEY,
            JSON.stringify(offers)
        );

        return true;

    } catch (error) {
        console.warn(
            "Offers cache save failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeOffer(offer) {
    if (!offer || !offer.id) {
        return null;
    }

    return {
        id: offer.id,
        name: offer.name || "",
        description: offer.description || "",
        price: offer.price ?? 0,
        image: offer.image || "",
        active: offer.active !== false,
        created_at: offer.created_at || null,
        updated_at: offer.updated_at || null,
        offer_items:
            Array.isArray(offer.offer_items)
                ? offer.offer_items
                : []
    };
}


/* =========================================================
   SORT
   ========================================================= */

function sortOffers(offers) {
    return offers.sort(
        function (a, b) {
            return (
                new Date(b.created_at || 0) -
                new Date(a.created_at || 0)
            );
        }
    );
}


/* =========================================================
   SUPABASE SELECT
   ========================================================= */

function getOffersSelectFields() {
    return `
        id,
        name,
        description,
        price,
        image,
        active,
        created_at,
        updated_at,
        offer_items (
            quantity,
            products (
                name
            )
        )
    `;
}


/* =========================================================
   FETCH FULL OFFERS PAGE
   ========================================================= */

async function fetchOffersPage(pageIndex) {
    const from =
        pageIndex * OFFERS_PAGE_SIZE;

    const to =
        from + OFFERS_PAGE_SIZE - 1;

    const {
        data,
        error
    } = await supabaseClient
        .from("offers")
        .select(
            getOffersSelectFields()
        )
        .eq("active", true)
        .order("created_at", {
            ascending: false
        })
        .range(from, to);

    if (error) {
        throw error;
    }

    return (data || [])
        .map(normalizeOffer)
        .filter(Boolean);
}


/* =========================================================
   FETCH FULL OFFERS BY IDS
   ========================================================= */

async function fetchOffersByIds(ids) {
    if (
        !Array.isArray(ids) ||
        ids.length === 0
    ) {
        return [];
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("offers")
        .select(
            getOffersSelectFields()
        )
        .in("id", ids);

    if (error) {
        throw error;
    }

    return (data || [])
        .map(normalizeOffer)
        .filter(Boolean);
}


/* =========================================================
   FETCH LIGHTWEIGHT METADATA
   ========================================================= */

async function fetchOffersMetadata(ids) {
    if (
        !Array.isArray(ids) ||
        ids.length === 0
    ) {
        return [];
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("offers")
        .select(
            "id, updated_at, active, created_at"
        )
        .in("id", ids);

    if (error) {
        throw error;
    }

    return data || [];
}


/* =========================================================
   FETCH FIRST PAGE METADATA
   ---------------------------------------------------------
   Used only to detect:
   - New offers
   - Deleted/inactive offers
   - Reordering of the first page
   ========================================================= */

async function fetchFirstPageMetadata() {
    const {
        data,
        error
    } = await supabaseClient
        .from("offers")
        .select(
            "id, updated_at, active, created_at"
        )
        .eq("active", true)
        .order("created_at", {
            ascending: false
        })
        .range(
            0,
            OFFERS_PAGE_SIZE - 1
        );

    if (error) {
        throw error;
    }

    return data || [];
}


/* =========================================================
   IMAGE LAZY LOADING
   ========================================================= */

function setupOfferImageObserver() {
    if (imageObserver) {
        return;
    }

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        document
            .querySelectorAll(
                "img[data-src]"
            )
            .forEach(
                function (img) {
                    img.src =
                        img.dataset.src;

                    img.removeAttribute(
                        "data-src"
                    );
                }
            );

        return;
    }

    imageObserver =
        new IntersectionObserver(
            function (
                entries,
                observer
            ) {
                entries.forEach(
                    function (entry) {
                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        const img =
                            entry.target;

                        const src =
                            img.dataset.src;

                        if (src) {
                            img.src = src;

                            img.removeAttribute(
                                "data-src"
                            );
                        }

                        observer.unobserve(
                            img
                        );
                    }
                );
            },
            {
                rootMargin:
                    "500px 0px"
            }
        );

    observeOfferImages();
}


function observeOfferImages() {
    if (!imageObserver) {
        return;
    }

    document
        .querySelectorAll(
            "img[data-src]"
        )
        .forEach(
            function (img) {
                imageObserver.observe(
                    img
                );
            }
        );
}


/* =========================================================
   OFFER CARD
   ========================================================= */

function createOfferCard(offer) {
    const card =
        document.createElement(
            "article"
        );

    card.className =
        "offer-card";

    card.dataset.id =
        offer.id;

    const imageHtml =
        offer.image
            ? `
                <div class="offer-image-wrapper">
                    <img
                        data-src="${escapeHtml(
                            offer.image
                        )}"
                        alt="${escapeHtml(
                            offer.name
                        )}"
                        decoding="async"
                    >
                </div>
            `
            : `
                <div class="offer-image-wrapper offer-image-placeholder">
                    <span>AL YOSRA STORE</span>
                </div>
            `;

    card.innerHTML = `
        ${imageHtml}

        <div class="offer-special-strip">
            <div class="offer-special-track">

                <div class="offer-special-group">
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                </div>

                <div
                    class="offer-special-group"
                    aria-hidden="true"
                >
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                    <span>Special Offer</span>
                </div>

            </div>
        </div>

        <div class="offer-content">

            <h2>
                ${escapeHtml(
                    offer.name
                )}
            </h2>

            ${
                offer.description
                    ? `
                        <p class="offer-description">
                            ${escapeHtml(
                                offer.description
                            )}
                        </p>
                    `
                    : ""
            }

            <div class="offer-price">
                ${formatOfferPrice(
                    offer.price
                )}
            </div>

            <div class="offer-discover">
                اضغط لاكتشاف تفاصيل العرض
            </div>

        </div>
    `;

    card.addEventListener(
        "click",
        function () {
            window.location.href =
                "offer-details.html?id=" +
                encodeURIComponent(
                    offer.id
                );
        }
    );

    return card;
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {
    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   PRICE
   ========================================================= */

function formatOfferPrice(price) {
    const numericPrice =
        Number(price);

    if (
        !Number.isFinite(
            numericPrice
        )
    ) {
        return escapeHtml(
            price
        );
    }

    return `
        $${numericPrice.toLocaleString(
            "en-US"
        )}
    `;
}


/* =========================================================
   DISPLAY
   ========================================================= */

function displayOffers(offers) {
    if (!offersContainer) {
        return;
    }

    offersContainer.innerHTML =
        "";

    if (!offers.length) {
        offersContainer.innerHTML = `
            <div class="offers-empty">
                لا توجد عروض متاحة حاليًا.
            </div>
        `;

        return;
    }

    const fragment =
        document.createDocumentFragment();

    offers.forEach(
        function (offer) {
            fragment.appendChild(
                createOfferCard(
                    offer
                )
            );
        }
    );

    offersContainer.appendChild(
        fragment
    );

    setupOfferImageObserver();
    observeOfferImages();
}


/* =========================================================
   APPEND OFFERS
   ========================================================= */

function appendOffers(offers) {
    if (
        !offersContainer ||
        !offers.length
    ) {
        return;
    }

    const fragment =
        document.createDocumentFragment();

    offers.forEach(
        function (offer) {
            fragment.appendChild(
                createOfferCard(
                    offer
                )
            );
        }
    );

    offersContainer.appendChild(
        fragment
    );

    observeOfferImages();
}


/* =========================================================
   LOAD NEXT PAGE
   ========================================================= */

async function loadNextOffersPage() {
    if (
        isLoadingMore ||
        !hasMoreOffers
    ) {
        return;
    }

    isLoadingMore = true;

    try {
        const pageIndex =
            currentPage;

        const newOffers =
            await fetchOffersPage(
                pageIndex
            );

        if (!newOffers.length) {
            hasMoreOffers =
                false;

            return;
        }

        const existingIds =
            new Set(
                allOffers.map(
                    function (
                        offer
                    ) {
                        return String(
                            offer.id
                        );
                    }
                )
            );

        const uniqueNewOffers =
            newOffers.filter(
                function (
                    offer
                ) {
                    return !existingIds.has(
                        String(
                            offer.id
                        )
                    );
                }
            );

        if (
            uniqueNewOffers.length
        ) {
            allOffers.push(
                ...uniqueNewOffers
            );
        }

        currentPage++;

        if (
            newOffers.length <
            OFFERS_PAGE_SIZE
        ) {
            hasMoreOffers =
                false;
        }

        sortOffers(
            allOffers
        );

        window.offers =
            allOffers;

        saveOffersCache(
            allOffers
        );

        appendOffers(
            uniqueNewOffers
        );

        markOfferBatchAsSynced(
            currentPage - 1
        );

        setupInfiniteScroll();

    } catch (error) {
        console.error(
            "Failed to load offers page:",
            error
        );

    } finally {
        isLoadingMore =
            false;
    }
}


/* =========================================================
   CACHE LOADING
   ========================================================= */

function loadOffersFromCache() {
    const cachedOffers =
        readOffersCache();

    if (
        !cachedOffers ||
        !cachedOffers.length
    ) {
        return false;
    }

    allOffers =
        cachedOffers
            .map(
                normalizeOffer
            )
            .filter(Boolean);

    if (!allOffers.length) {
        return false;
    }

    sortOffers(
        allOffers
    );

    window.offers =
        allOffers;

    currentPage =
        Math.ceil(
            allOffers.length /
            OFFERS_PAGE_SIZE
        );

    hasMoreOffers =
        allOffers.length >=
        OFFERS_PAGE_SIZE;

    displayOffers(
        allOffers
    );

    return true;
}


/* =========================================================
   BATCH HELPERS
   ========================================================= */

function getOfferBatchIndexByPosition(
    index
) {
    return Math.floor(
        index /
        OFFERS_PAGE_SIZE
    );
}


function getOfferBatchOffers(
    batchIndex
) {
    const start =
        batchIndex *
        OFFERS_PAGE_SIZE;

    return allOffers.slice(
        start,
        start +
            OFFERS_PAGE_SIZE
    );
}


function markOfferBatchAsSynced(
    batchIndex
) {
    syncedOfferBatches.add(
        batchIndex
    );
}


/* =========================================================
   SMART FIRST-PAGE SYNC
   ---------------------------------------------------------
   Compares the first cached page against the current
   first active page in Supabase.

   Only changed/new offers are fully fetched.
   Removed/inactive offers are removed locally.
   ========================================================= */

async function syncFirstOffersPage() {
    if (!allOffers.length) {
        return;
    }

    if (
        syncingOfferBatches.has(0)
    ) {
        return;
    }

    syncingOfferBatches.add(0);

    try {
        const cachedFirstPage =
            allOffers.slice(
                0,
                OFFERS_PAGE_SIZE
            );

        const currentMetadata =
            await fetchFirstPageMetadata();

        const currentMap =
            new Map(
                currentMetadata.map(
                    function (item) {
                        return [
                            String(
                                item.id
                            ),
                            item
                        ];
                    }
                )
            );

        const cachedMap =
            new Map(
                cachedFirstPage.map(
                    function (
                        offer
                    ) {
                        return [
                            String(
                                offer.id
                            ),
                            offer
                        ];
                    }
                )
            );

        /*
         * IDs currently present in the first
         * active database page.
         */
        const currentIds =
            currentMetadata.map(
                function (item) {
                    return String(
                        item.id
                    );
                }
            );

        /*
         * IDs that need a full fetch:
         *
         * - New
         * - updated_at changed
         */
        const idsToFetch = [];

        currentMetadata.forEach(
            function (current) {
                const id =
                    String(
                        current.id
                    );

                const cached =
                    cachedMap.get(
                        id
                    );

                if (!cached) {
                    idsToFetch.push(
                        current.id
                    );

                    return;
                }

                const cachedUpdatedAt =
                    cached.updated_at ||
                    "";

                const currentUpdatedAt =
                    current.updated_at ||
                    "";

                if (
                    cachedUpdatedAt !==
                    currentUpdatedAt
                ) {
                    idsToFetch.push(
                        current.id
                    );
                }
            }
        );

        let freshOffers = [];

        if (idsToFetch.length) {
            freshOffers =
                await fetchOffersByIds(
                    idsToFetch
                );
        }

        const freshMap =
            new Map(
                freshOffers.map(
                    function (
                        offer
                    ) {
                        return [
                            String(
                                offer.id
                            ),
                            offer
                        ];
                    }
                )
            );

        /*
         * Build the correct first page
         * in Supabase's current order.
         *
         * Important:
         * This handles insertion/removal/reordering
         * without downloading unchanged offers.
         */
        const updatedFirstPage =
            [];

        currentIds.forEach(
            function (id) {
                const fresh =
                    freshMap.get(
                        id
                    );

                if (fresh) {
                    updatedFirstPage.push(
                        fresh
                    );

                    return;
                }

                const cached =
                    cachedMap.get(
                        id
                    );

                if (cached) {
                    updatedFirstPage.push(
                        cached
                    );
                }
            }
        );

        /*
         * Remove the old first page and replace
         * it with the synchronized first page.
         */
        allOffers.splice(
            0,
            cachedFirstPage.length,
            ...updatedFirstPage
        );

        /*
         * If the number of first-page offers
         * changed, the boundary between pages
         * may have shifted.
         *
         * In that case, we do not blindly assume
         * the old second page is still correct.
         *
         * We keep the cached data for now and let
         * infinite-scroll pagination fetch the
         * next required page when needed.
         */
        sortOffers(
            allOffers
        );

        window.offers =
            allOffers;

        saveOffersCache(
            allOffers
        );

        /*
         * If we had a full first page and the
         * database still has 20+ active offers,
         * there are potentially more pages.
         */
        hasMoreOffers =
            currentMetadata.length >=
            OFFERS_PAGE_SIZE ||
            allOffers.length >=
            OFFERS_PAGE_SIZE;

        syncedOfferBatches.add(
            0
        );

        /*
         * Re-render only if something actually
         * changed in the first page.
         */
        const oldSignature =
            cachedFirstPage
                .map(
                    function (
                        offer
                    ) {
                        return (
                            String(
                                offer.id
                            ) +
                            "|" +
                            (
                                offer.updated_at ||
                                ""
                            )
                        );
                    }
                )
                .join(",");

        const newSignature =
            updatedFirstPage
                .map(
                    function (
                        offer
                    ) {
                        return (
                            String(
                                offer.id
                            ) +
                            "|" +
                            (
                                offer.updated_at ||
                                ""
                            )
                        );
                    }
                )
                .join(",");

        if (
            oldSignature !==
            newSignature
        ) {
            displayOffers(
                allOffers
            );

            setupInfiniteScroll();
        }

    } catch (error) {
        console.warn(
            "First offers sync failed:",
            error
        );

    } finally {
        syncingOfferBatches.delete(
            0
        );
    }
}


/* =========================================================
   SYNC NON-FIRST CACHED BATCH
   ========================================================= */

async function syncOfferBatch(
    batchIndex
) {
    if (
        syncedOfferBatches.has(
            batchIndex
        ) ||
        syncingOfferBatches.has(
            batchIndex
        )
    ) {
        return;
    }

    if (
        batchIndex === 0
    ) {
        await syncFirstOffersPage();
        return;
    }

    const batch =
        getOfferBatchOffers(
            batchIndex
        );

    if (!batch.length) {
        return;
    }

    syncingOfferBatches.add(
        batchIndex
    );

    try {
        const ids =
            batch.map(
                function (
                    offer
                ) {
                    return offer.id;
                }
            );

        const metadata =
            await fetchOffersMetadata(
                ids
            );

        const metadataMap =
            new Map(
                metadata.map(
                    function (
                        item
                    ) {
                        return [
                            String(
                                item.id
                            ),
                            item
                        ];
                    }
                )
            );

        const changedIds =
            [];

        batch.forEach(
            function (
                cachedOffer
            ) {
                const current =
                    metadataMap.get(
                        String(
                            cachedOffer.id
                        )
                    );

                /*
                 * Missing from active results:
                 * removed or inactive.
                 */
                if (!current) {
                    return;
                }

                if (
                    (
                        cachedOffer.updated_at ||
                        ""
                    ) !==
                    (
                        current.updated_at ||
                        ""
                    )
                ) {
                    changedIds.push(
                        cachedOffer.id
                    );
                }
            }
        );

        let freshChangedOffers =
            [];

        if (
            changedIds.length
        ) {
            freshChangedOffers =
                await fetchOffersByIds(
                    changedIds
                );
        }

        const freshMap =
            new Map(
                freshChangedOffers.map(
                    function (
                        offer
                    ) {
                        return [
                            String(
                                offer.id
                            ),
                            offer
                        ];
                    }
                )
            );

        const batchStart =
            batchIndex *
            OFFERS_PAGE_SIZE;

        const updatedBatch =
            [];

        batch.forEach(
            function (
                cachedOffer
            ) {
                const current =
                    metadataMap.get(
                        String(
                            cachedOffer.id
                        )
                    );

                /*
                 * Deleted/inactive:
                 * do not keep it.
                 */
                if (!current) {
                    return;
                }

                const fresh =
                    freshMap.get(
                        String(
                            cachedOffer.id
                        )
                    );

                /*
                 * Changed:
                 * use the fresh full record.
                 */
                if (fresh) {
                    updatedBatch.push(
                        fresh
                    );

                    return;
                }

                /*
                 * Unchanged:
                 * keep the cached record.
                 */
                updatedBatch.push(
                    cachedOffer
                );
            }
        );

        allOffers.splice(
            batchStart,
            batch.length,
            ...updatedBatch
        );

        sortOffers(
            allOffers
        );

        window.offers =
            allOffers;

        saveOffersCache(
            allOffers
        );

        syncedOfferBatches.add(
            batchIndex
        );

        if (
            changedIds.length ||
            updatedBatch.length !==
                batch.length
        ) {
            displayOffers(
                allOffers
            );

            setupInfiniteScroll();
        }

    } catch (error) {
        console.warn(
            "Offer batch sync failed:",
            error
        );

    } finally {
        syncingOfferBatches.delete(
            batchIndex
        );
    }
}


/* =========================================================
   CACHE SYNCHRONIZATION
   ========================================================= */

async function syncOffersCache() {
    if (!allOffers.length) {
        return;
    }

    /*
     * First page gets special treatment because
     * it is where new offers appear and where
     * deleted/reordered offers affect pagination.
     */
    await syncFirstOffersPage();
}


/* =========================================================
   BATCH INTERSECTION OBSERVER
   ========================================================= */

function setupOfferBatchSyncObserver() {
    if (
        !(
            "IntersectionObserver"
            in window
        ) ||
        !offersContainer
    ) {
        return;
    }

    if (
        offerBatchSyncObserver
    ) {
        offerBatchSyncObserver.disconnect();
    }

    offerBatchSyncObserver =
        new IntersectionObserver(
            function (
                entries
            ) {
                entries.forEach(
                    function (
                        entry
                    ) {
                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        const card =
                            entry.target;

                        const cards =
                            Array.from(
                                offersContainer.querySelectorAll(
                                    ".offer-card"
                                )
                            );

                        const index =
                            cards.indexOf(
                                card
                            );

                        if (
                            index === -1
                        ) {
                            return;
                        }

                        const batchIndex =
                            getOfferBatchIndexByPosition(
                                index
                            );

                        syncOfferBatch(
                            batchIndex
                        );
                    }
                );
            },
            {
                rootMargin:
                    "700px 0px"
            }
        );

    observeOfferBatchTriggers();
}


function observeOfferBatchTriggers() {
    if (
        !offerBatchSyncObserver
    ) {
        return;
    }

    const cards =
        offersContainer.querySelectorAll(
            ".offer-card"
        );

    for (
        let batchStart = 0;
        batchStart <
        cards.length;
        batchStart +=
            OFFERS_PAGE_SIZE
    ) {
        const triggerIndex =
            Math.min(
                batchStart +
                    OFFERS_PAGE_SIZE -
                    5,
                cards.length - 1
            );

        const triggerCard =
            cards[
                triggerIndex
            ];

        if (triggerCard) {
            offerBatchSyncObserver.observe(
                triggerCard
            );
        }
    }
}


/* =========================================================
   INFINITE SCROLL
   ========================================================= */

function setupInfiniteScroll() {
    if (!offersContainer) {
        return;
    }

    if (
        !(
            "IntersectionObserver"
            in window
        )
    ) {
        setupFallbackScroll();
        return;
    }

    if (
        infiniteScrollObserver
    ) {
        infiniteScrollObserver.disconnect();
    }

    if (offersSentinel) {
        offersSentinel.remove();
    }

    offersSentinel =
        document.createElement(
            "div"
        );

    offersSentinel.className =
        "offers-sentinel";

    offersSentinel.setAttribute(
        "aria-hidden",
        "true"
    );

    offersContainer.after(
        offersSentinel
    );

    infiniteScrollObserver =
        new IntersectionObserver(
            function (
                entries
            ) {
                entries.forEach(
                    function (
                        entry
                    ) {
                        if (
                            entry.isIntersecting &&
                            hasMoreOffers
                        ) {
                            loadNextOffersPage();
                        }
                    }
                );
            },
            {
                rootMargin:
                    "700px 0px"
            }
        );

    infiniteScrollObserver.observe(
        offersSentinel
    );

    setupOfferBatchSyncObserver();
}


function setupFallbackScroll() {
    if (
        window.__offersScrollHandler
    ) {
        return;
    }

    window.__offersScrollHandler =
        function () {
            if (
                isLoadingMore ||
                !hasMoreOffers
            ) {
                return;
            }

            const scrollPosition =
                window.scrollY +
                window.innerHeight;

            const pageHeight =
                document.documentElement
                    .scrollHeight;

            if (
                pageHeight -
                    scrollPosition <
                900
            ) {
                loadNextOffersPage();
            }
        };

    window.addEventListener(
        "scroll",
        window.__offersScrollHandler,
        {
            passive: true
        }
    );
}


/* =========================================================
   SEARCH
   ========================================================= */

function searchOffers(
    searchTerm
) {
    const query =
        String(
            searchTerm || ""
        )
            .trim()
            .toLowerCase();

    if (!query) {
        displayOffers(
            allOffers
        );

        setupInfiniteScroll();

        return;
    }

    const filtered =
        allOffers.filter(
            function (
                offer
            ) {
                const name =
                    String(
                        offer.name ||
                            ""
                    ).toLowerCase();

                const description =
                    String(
                        offer.description ||
                            ""
                    ).toLowerCase();

                return (
                    name.includes(
                        query
                    ) ||
                    description.includes(
                        query
                    )
                );
            }
        );

    displayOffers(
        filtered
    );
}


/* =========================================================
   SEARCH UI
   ========================================================= */

/* =========================================================
   SEARCH UI
   ========================================================= */

function setupOfferSearch() {
    // جلب العناصر بشكل آمن لضمان عدم حدوث أخطاء
    const offerSearchToggle = document.getElementById("offerSearchToggle");
    const offerSearchPopover = document.getElementById("offerSearchPopover");
    const offerSearchInput = document.getElementById("offerSearchInput");

    if (
        !offerSearchToggle ||
        !offerSearchPopover ||
        !offerSearchInput
    ) {
        return;
    }

    function openSearch() {
        offerSearchPopover.classList.add(
            "open"
        );

        // حل مشكلة الكونسول: إخبار المتصفح أن العنصر لم يعد مخفياً
        offerSearchPopover.setAttribute(
            "aria-hidden", 
            "false"
        );

        requestAnimationFrame(
            function () {
                offerSearchInput.focus();
            }
        );
    }

    function closeSearch() {
        offerSearchPopover.classList.remove(
            "open"
        );

        // إعادة إخفاء العنصر عن قارئات الشاشة بعد الإغلاق
        offerSearchPopover.setAttribute(
            "aria-hidden", 
            "true"
        );
    }

    offerSearchToggle.addEventListener(
        "click",
        function (event) {
            event.stopPropagation();

            if (
                offerSearchPopover.classList.contains(
                    "open"
                )
            ) {
                closeSearch();
            } else {
                openSearch();
            }
        }
    );

    offerSearchInput.addEventListener(
        "input",
        function () {
            searchOffers(
                offerSearchInput.value
            );
        }
    );

    document.addEventListener(
        "click",
        function (event) {
            if (
                !offerSearchPopover.contains(
                    event.target
                ) &&
                !offerSearchToggle.contains(
                    event.target
                )
            ) {
                closeSearch();
            }
        }
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (
                event.key ===
                "Escape"
            ) {
                closeSearch();
            }
        }
    );
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

async function loadOffers() {
    if (offersInitialized) {
        return;
    }

    offersInitialized =
        true;

    const hasCache =
        loadOffersFromCache();

    if (!hasCache) {
        allOffers = [];

        window.offers =
            allOffers;

        currentPage = 0;

        hasMoreOffers =
            true;

        if (offersContainer) {
            offersContainer.innerHTML = `
                <div class="offers-loading">
                    جاري تحميل العروض...
                </div>
            `;
        }

        await loadNextOffersPage();

    } else {

        /*
         * Display cache immediately.
         * Then perform one lightweight sync.
         */
        await syncOffersCache();

        setupInfiniteScroll();
    }

    setupOfferBatchSyncObserver();
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        setupOfferSearch();

        setupOfferImageObserver();

        loadOffers();
    }
);