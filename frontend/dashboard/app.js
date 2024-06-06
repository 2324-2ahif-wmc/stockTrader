import auth from "../assets/scripts/auth.js";
import endpoint from "../assets/scripts/config.js";

let marketSymbol;

function formatCurrency(value) {
    return value.toLocaleString('de-AT', { style: 'currency', currency: 'USD' });
}

function formatTimestamp(timestamp, containsSeconds = false) {
    const date = new Date(timestamp);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    if (containsSeconds) {
        options.second = '2-digit';
    }
    return date.toLocaleDateString('de-AT', options);
}

function initTabSelectionHandler() {
    const buttons = document.querySelectorAll("#tab-selection button");
    let params = new URLSearchParams(window.location.search);

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            buttons.forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            const display = button.getAttribute("data-display");

            params.set("display", display);
            window.history.replaceState({}, "", `${window.location.pathname}?${params}`);

            await loadContent(display);
        });
    });
};

async function loadContent(display) {
    const tabContent = document.getElementById("tab");
    const user = JSON.parse(localStorage.getItem("user"));

    switch (display) {
        case "stocks":
            tabContent.innerHTML = `
                <table class="table table-striped w-50">
                    <thead>
                        <tr>
                            <th scope="col">Symbol</th>
                            <th scope="col">Average Price</th>
                            <th scope="col">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${user.currentStocks.map(stock => `<tr><th scope="row">${stock.symbol}</th><td>${formatCurrency(stock.averagePrice)}</td><td>${stock.quantity}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
            break;

        case "transactions":
            tabContent.innerHTML = `
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Transaction Type</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${user.transactions.map(stock => `<tr><th scope="row">${stock.symbol}</th><td class="green">${stock.type}</td><td>${formatCurrency(stock.price)}</td><td>${stock.quantity}</td><td>${formatTimestamp(stock.timestamp, true)}</td></tr>`).join('')}
                    </tbody>
                </table>
            `;
            break;

        case "buy-stocks":
            tabContent.innerHTML = `
                <div id="searchBar">
                    <div>
                        <form
                            class="d-flex"
                            role="search"
                            id="search-form"
                            autocomplete="off"
                        >
                            <input
                                class="form-control me-2"
                                type="search"
                                placeholder="Search..."
                                aria-label="Search"
                                id="search"
                                required
                            />
                            <button class="btn btn-primary" type="submit">Search</button>
                        </form>
                        <div id="results"></div>
                    </div>
                </div>
                <div id="buy-form-container">
                    <form class="d-flex" id="buy-form">
                        <input
                            class="form-control me-2"
                            type="number"
                            placeholder="Quantity"
                            aria-label="Quantity"
                            id="quantity"
                            min="1"
                            required
                        />
                        <button class="btn btn-primary" type="submit">Buy</button>
                    </form>
                </div>
            `;
            await initSearchBarHandler();
            await initBuyFormHandler();
            break;

        case "sell-stocks":
            tabContent.innerHTML = `
                <div></div>
            `;
            break;
    }
}

async function initSearchBarHandler() {
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search");
    const resultsDiv = document.getElementById("results");

    const markets = await fetchMarkets(`${endpoint}/markets`);

    searchInput.addEventListener("input", (e) => {
        const value = e.target.value;
        filterAndDisplayMarkets(value, resultsDiv, searchForm, markets);
    });

    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const enteredValue = searchForm.search.value;
        resultsDiv.innerHTML = "";
        const market = markets.find(
            (m) =>
                m.name.toLowerCase() === enteredValue.toLowerCase() ||
                m.symbol.toLowerCase() === enteredValue.toLowerCase()
        );

        searchForm.search.value = market.name;
        marketSymbol = market.symbol;
    });
}

function filterAndDisplayMarkets(value, resultsDiv, searchForm, markets) {
    resultsDiv.innerHTML = "";
    const newDiv = document.createElement("div");
    if (value) {
        const filteredMarkets = markets
            .filter(
                (market) =>
                    market.symbol.toLowerCase().includes(value.toLowerCase()) ||
                    market.name.toLowerCase().includes(value.toLowerCase())
            )
            .slice(0, 5);

        filteredMarkets.forEach((market) => {
            const resultItem = document.createElement("p");
            resultItem.classList.add("result-item");
            resultItem.textContent = `${market.name} (${market.symbol})`;

            resultItem.addEventListener("click", () => {
                searchForm.search.value = market.name;
                marketSymbol = market.symbol;
                resultsDiv.innerHTML = "";
            });
            newDiv.appendChild(resultItem);
        });

        if (newDiv.children.length === 0) {
            resultsDiv.innerHTML = `<div><p class="result-item">No results</p></div>`;
        } else {
            resultsDiv.appendChild(newDiv);
        }
    }
}

async function fetchMarkets(fetchUrl) {
    const response = await fetch(fetchUrl);
    if (response.ok) {
        return await response.json();
    } else {
        console.error(await response.text());
        return [];
    }
}

async function initBuyFormHandler() {
    const modal = new bootstrap.Modal(document.getElementById('modal'));
    const modalBody = document.querySelector('#modal div.content');

    document.getElementById("buy-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const quantity = parseInt(document.getElementById("quantity").value);

        if (!quantity || quantity <= 0) {
            modalBody.innerHTML = `<p class="red">Invalid quantity</p>`;
            modal.show();
        } else {
            if (marketSymbol) {
                const response = await fetch(`${endpoint}/market/buy?symbol=${marketSymbol}&quantity=${quantity}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("jwt")}`,
                    },
                });

                if (response.ok) {
                    const json = await response.json();
                    localStorage.setItem("user", JSON.stringify(json));
                    window.location.reload();
                } else {
                    modalBody.innerHTML = `<p class="red">${await response.text()}</p>`;
                    modal.show();
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!await auth()) {
        window.location.href = "../signIn";
        return;
    }

    const user = JSON.parse(localStorage.getItem("user"));

    document.getElementById("share-in-stocks-value").innerText = formatCurrency(user.transactions ? user.currentStocks.reduce((sum, stock) => sum + (stock.quantity * stock.averagePrice), 0) : 0);
    document.getElementById("balance-value").innerText = formatCurrency(user.balance);

    const params = new URLSearchParams(window.location.search);
    const display = params.get("display");

    if (display) {
        const buttons = document.querySelectorAll("#tab-selection button");
        const button = [...buttons].find(b => b.getAttribute("data-display") === display);
        button.classList.add("active");
        await loadContent(display);
    }

    initTabSelectionHandler();
});
