// js/app.js
// =============================================================================
// RideMate frontend logic (plain JavaScript, no frameworks).
//
// This file NEVER talks to the database directly and contains NO secrets.
// It only calls our own Netlify Functions with fetch():
//
//   GET  /api/get-rides                 -> list upcoming rides
//   GET  /api/search-rides?from&to&date -> search rides
//   GET  /api/get-ride?id=1             -> one ride
//   POST /api/create-ride               -> offer a ride
//   POST /api/join-ride                 -> book seats
//   GET  /api/get-bookings?user_id=1    -> my bookings
//
// The same file is used by every page. At the bottom, we check which page we
// are on (by looking for certain elements) and run the matching code.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. SMALL HELPERS
// -----------------------------------------------------------------------------

// Call one of our API functions and return the JSON.
// Throws an Error with a friendly message if something goes wrong.
async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(path, {
            ...options,
            headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        });
    } catch {
        throw new Error("Can't reach the server. Check your internet connection and try again.");
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        // response was not JSON (e.g. a 404 page)
    }

    if (!response.ok) {
        const error = new Error((data && data.error) || `Something went wrong (error ${response.status}).`);
        error.details = data && data.errors; // list of validation messages, if any
        error.status = response.status;
        throw error;
    }
    return data;
}

// Protect against HTML injection: always escape text from the database
// before putting it inside innerHTML.
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// "Ahmed Khan" -> "AK"
function initials(name) {
    return String(name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

// "08:00" -> "08:00 AM", "13:00" -> "01:00 PM"
function formatTime(time) {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

// "2026-10-15" -> "Thu, 15 Oct 2026"
function formatDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// 1200 -> "Rs. 1,200"
function formatPrice(amount) {
    return `Rs. ${Number(amount).toLocaleString("en-US")}`;
}

// Today's date as "YYYY-MM-DD" in the visitor's local time
function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Show a small pop-up message at the bottom of the screen
let toastTimer;
function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle("error", type === "error");
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

// Show validation/server errors inside a form
function showFormError(element, messages) {
    const list = Array.isArray(messages) ? messages : [messages];
    element.innerHTML =
        list.length === 1
            ? escapeHtml(list[0])
            : `<ul>${list.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`;
    element.classList.add("show");
}

function hideFormError(element) {
    element.classList.remove("show");
    element.innerHTML = "";
}

// Put a button into a "loading" state and back
function setLoading(button, isLoading, loadingText) {
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
    }
}

// -----------------------------------------------------------------------------
// 2. "REMEMBER ME" (localStorage)
// There is no login system yet, so after you offer or join a ride we remember
// your user id, name, email and phone in THIS browser. This pre-fills forms and
// lets the "My Bookings" page know whose bookings to show.
// -----------------------------------------------------------------------------

const USER_KEY = "ridemate_user";

function getSavedUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch {
        return null;
    }
}

function saveUser(user) {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
        // private browsing may block localStorage; the app still works without it
    }
}

// -----------------------------------------------------------------------------
// 3. RIDE CARDS
// Builds the same HTML as the original hardcoded cards, but from database data.
// -----------------------------------------------------------------------------

function rideCardHtml(ride) {
    const driver = ride.driver;
    const rating = driver.rating != null ? `⭐ ${driver.rating.toFixed(1)}` : "🆕 New driver";
    const seatsLeft = ride.available_seats;
    const isFull = seatsLeft <= 0 || ride.status !== "active";
    const arrival = ride.arrival_time ? ` — ${formatTime(ride.arrival_time)}` : "";
    const detailsUrl = `/pages/ride-details.html?id=${ride.id}`;

    return `
        <div class="ride-card" data-ride-id="${ride.id}">

            <a href="${detailsUrl}" class="details-link" title="View ride details">
                <div class="driver">
                    <div class="avatar">${escapeHtml(initials(driver.name))}</div>
                    <div>
                        <strong>${escapeHtml(driver.name)}</strong>
                        <br>
                        <small>${rating} • ${driver.total_rides} rides</small>
                    </div>
                </div>

                <div class="route">
                    <div class="route-line">
                        <div class="dot"></div>
                        <div class="line"></div>
                        <div class="dot"></div>
                    </div>
                    <div class="location">
                        <p>${escapeHtml(ride.from_location)} — ${formatTime(ride.departure_time)}</p>
                        <p>${escapeHtml(ride.to_location)}${arrival}</p>
                    </div>
                </div>

                <div class="ride-meta">
                    <span>📅 ${formatDate(ride.departure_date)}</span>
                    <span class="seats-left ${seatsLeft === 1 ? "low" : ""}">
                        ${isFull ? "Full" : `${seatsLeft} of ${ride.total_seats} seats left`}
                    </span>
                </div>
            </a>

            <div class="ride-footer">
                <div class="price">${formatPrice(ride.price)}</div>
                <button type="button" class="join" data-join="${ride.id}" ${isFull ? "disabled" : ""}>
                    ${isFull ? "Ride Full" : "Join Ride"}
                </button>
            </div>

        </div>`;
}

function statusMessageHtml(title, text = "", type = "") {
    return `
        <div class="status-message ${type}">
            <strong>${title}</strong>
            ${text}
        </div>`;
}

function loadingHtml(text) {
    return `<div class="status-message"><span class="spinner"></span> ${escapeHtml(text)}</div>`;
}

// -----------------------------------------------------------------------------
// 4. JOIN RIDE POPUP (used on the home page and the ride details page)
// -----------------------------------------------------------------------------

let currentJoinRide = null; // the ride shown in the popup
let onJoinSuccess = null; // what to do after a successful booking

function createJoinModal() {
    if (document.getElementById("join-modal")) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
    <div class="modal-backdrop" id="join-modal" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="join-title">

            <button type="button" class="modal-close" data-close-modal aria-label="Close">&times;</button>

            <h3 id="join-title">Join Ride</h3>
            <p class="modal-sub" id="join-summary"></p>

            <form id="join-form" novalidate>
                <div class="input-box">
                    <label for="join-name">YOUR NAME</label>
                    <input type="text" id="join-name" name="name" maxlength="80" placeholder="e.g. Ayesha Siddiqui" required>
                </div>

                <div class="input-box">
                    <label for="join-email">EMAIL</label>
                    <input type="email" id="join-email" name="email" maxlength="120" placeholder="you@example.com" required>
                </div>

                <div class="input-box">
                    <label for="join-phone">PHONE (OPTIONAL)</label>
                    <input type="tel" id="join-phone" name="phone" maxlength="20" placeholder="+92 300 1234567">
                </div>

                <div class="input-box">
                    <label for="join-seats">SEATS</label>
                    <input type="number" id="join-seats" name="seats" min="1" value="1" required>
                </div>

                <div class="form-error" id="join-error"></div>

                <button type="submit" class="btn primary full-width" id="join-submit">Confirm Booking</button>
            </form>

        </div>
    </div>`;
    document.body.appendChild(wrapper.firstElementChild);

    const modal = document.getElementById("join-modal");

    // close on ×, on clicking the dark background, or on Escape
    modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.hasAttribute("data-close-modal")) closeJoinModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeJoinModal();
    });

    document.getElementById("join-form").addEventListener("submit", submitJoinForm);
}

function openJoinModal(ride, afterSuccess) {
    createJoinModal();
    currentJoinRide = ride;
    onJoinSuccess = afterSuccess;

    // Prevent joining when the ride is full
    if (ride.available_seats <= 0) {
        showToast("Sorry, this ride is full.", "error");
        return;
    }

    const form = document.getElementById("join-form");
    const saved = getSavedUser();
    form.name.value = saved?.name || "";
    form.email.value = saved?.email || "";
    form.phone.value = saved?.phone || "";
    form.seats.value = 1;
    form.seats.max = ride.available_seats;

    document.getElementById("join-summary").textContent =
        `${ride.from_location} → ${ride.to_location} with ${ride.driver.name} • ` +
        `${formatDate(ride.departure_date)}, ${formatTime(ride.departure_time)} • ` +
        `${formatPrice(ride.price)} per seat • ${ride.available_seats} seat(s) left`;

    hideFormError(document.getElementById("join-error"));

    const modal = document.getElementById("join-modal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    (form.name.value ? form.seats : form.name).focus();
}

function closeJoinModal() {
    const modal = document.getElementById("join-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

async function submitJoinForm(event) {
    event.preventDefault();
    const form = event.target;
    const errorBox = document.getElementById("join-error");
    const button = document.getElementById("join-submit");
    const ride = currentJoinRide;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const seats = Number(form.seats.value);

    // ---- basic validation (the server checks everything again) ----
    const errors = [];
    if (!name) errors.push("Please enter your name.");
    if (!isValidEmail(email)) errors.push("Please enter a valid email address.");
    if (!Number.isInteger(seats) || seats < 1) errors.push("Seats must be at least 1.");
    else if (seats > ride.available_seats) errors.push(`Only ${ride.available_seats} seat(s) are left.`);
    if (errors.length) return showFormError(errorBox, errors);

    hideFormError(errorBox);
    setLoading(button, true, "Joining ride...");

    try {
        // Note: we only send the ride id and number of seats. The PRICE is
        // calculated by the server from the database, never sent from here.
        const saved = getSavedUser();
        const result = await api("/api/join-ride", {
            method: "POST",
            body: JSON.stringify({
                ride_id: ride.id,
                seats,
                name,
                email,
                phone,
                // only send the saved id if it belongs to the same email
                passenger_id: saved && saved.email === email.toLowerCase() ? saved.id : undefined,
            }),
        });

        saveUser({ id: result.passenger.id, name: result.passenger.name, email: email.toLowerCase(), phone });
        closeJoinModal();
        showToast(`${result.message} ${seats} seat(s) for ${formatPrice(result.booking.total_price)}.`);

        if (onJoinSuccess) onJoinSuccess(result);
    } catch (error) {
        showFormError(errorBox, error.details || error.message);
    } finally {
        setLoading(button, false);
    }
}

// -----------------------------------------------------------------------------
// 5. HOME PAGE: Popular Rides + Search
// -----------------------------------------------------------------------------

function initHomePage() {
    const list = document.getElementById("rides-list");
    const form = document.getElementById("search-form");
    const searchButton = document.getElementById("search-btn");
    const resultsBar = document.getElementById("results-bar");
    const resultsText = document.getElementById("results-text");
    const clearButton = document.getElementById("clear-search");

    let shownRides = []; // the rides currently on screen
    let lastSearch = null; // null = showing "Popular Rides", otherwise the search params

    // You can't search for a date in the past
    form.date.min = todayString();

    function render(rides) {
        shownRides = rides;
        if (rides.length === 0) {
            list.innerHTML = lastSearch
                ? statusMessageHtml(
                      "No rides found 😕",
                      "Try another date or a nearby city — or <a href='/pages/offer-ride.html' style='color:#38e8a5'>offer this ride yourself</a>."
                  )
                : statusMessageHtml(
                      "No upcoming rides yet",
                      "Be the first! <a href='/pages/offer-ride.html' style='color:#38e8a5'>Offer a ride</a>."
                  );
            return;
        }
        list.innerHTML = rides.map(rideCardHtml).join("");
    }

    // Load "Popular Rides" from the database
    async function loadRides() {
        lastSearch = null;
        resultsBar.hidden = true;
        list.innerHTML = loadingHtml("Loading rides...");
        try {
            const data = await api("/api/get-rides");
            render(data.rides);
        } catch (error) {
            list.innerHTML = statusMessageHtml("Couldn't load rides", escapeHtml(error.message), "error");
        }
    }

    // Search rides
    async function searchRides(params) {
        lastSearch = params;
        setLoading(searchButton, true, "Searching...");
        list.innerHTML = loadingHtml("Searching...");
        document.getElementById("rides").scrollIntoView({ behavior: "smooth" });

        try {
            const query = new URLSearchParams(params).toString();
            const data = await api(`/api/search-rides?${query}`);
            render(data.rides);

            const parts = [];
            if (params.from) parts.push(`from “${params.from}”`);
            if (params.to) parts.push(`to “${params.to}”`);
            if (params.date) parts.push(`on ${formatDate(params.date)}`);
            resultsText.textContent = `${data.rides.length} ride(s) found ${parts.join(" ")}`;
            resultsBar.hidden = false;
        } catch (error) {
            list.innerHTML = statusMessageHtml("Search failed", escapeHtml(error.message), "error");
        } finally {
            setLoading(searchButton, false);
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const params = {};
        const from = form.from.value.trim();
        const to = form.to.value.trim();
        const date = form.date.value;
        if (from) params.from = from;
        if (to) params.to = to;
        if (date) params.date = date;

        if (!from && !to && !date) {
            showToast("Enter a From, To or Date to search.", "error");
            form.from.focus();
            return;
        }
        if (date && date < todayString()) {
            showToast("Please pick today or a future date.", "error");
            return;
        }
        searchRides(params);
    });

    clearButton.addEventListener("click", () => {
        form.reset();
        loadRides();
    });

    // "Join Ride" buttons (one listener for all cards, even ones added later)
    list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-join]");
        if (!button) return;
        const ride = shownRides.find((r) => r.id === Number(button.dataset.join));
        if (!ride) return;

        openJoinModal(ride, (result) => {
            // update the card on screen with the new number of seats
            ride.available_seats = result.available_seats;
            if (ride.available_seats <= 0) ride.status = "full";
            render(shownRides);
        });
    });

    loadRides();
}

// -----------------------------------------------------------------------------
// 6. OFFER A RIDE PAGE
// -----------------------------------------------------------------------------

function initOfferRidePage() {
    const form = document.getElementById("offer-form");
    const errorBox = document.getElementById("offer-error");
    const successBox = document.getElementById("offer-success");
    const button = document.getElementById("offer-submit");

    form.departure_date.min = todayString();

    // Pre-fill driver details if we know this person already
    const saved = getSavedUser();
    if (saved) {
        form.driver_name.value = saved.name || "";
        form.email.value = saved.email || "";
        form.phone.value = saved.phone || "";
    }

    // Typing total seats fills in available seats automatically (if still empty)
    form.total_seats.addEventListener("input", () => {
        form.available_seats.max = form.total_seats.value;
        if (!form.available_seats.value) form.available_seats.value = form.total_seats.value;
    });

    function validate(data) {
        const errors = [];
        if (!data.driver_name) errors.push("Driver name is required.");
        if (!isValidEmail(data.email)) errors.push("Please enter a valid email address.");
        if (!data.from_location) errors.push("From cannot be empty.");
        if (!data.to_location) errors.push("To cannot be empty.");
        if (data.from_location && data.from_location.toLowerCase() === data.to_location.toLowerCase()) {
            errors.push("From and To must be different places.");
        }
        if (!data.departure_date) errors.push("Date is required.");
        else if (data.departure_date < todayString()) errors.push("Date cannot be in the past.");
        if (!data.departure_time) errors.push("Time is required.");
        if (!Number.isInteger(data.price) || data.price <= 0) errors.push("Price must be a positive whole number.");
        if (!Number.isInteger(data.total_seats) || data.total_seats < 1) errors.push("Total seats must be at least 1.");
        if (!Number.isInteger(data.available_seats) || data.available_seats < 1) {
            errors.push("Available seats must be greater than 0.");
        } else if (data.available_seats > data.total_seats) {
            errors.push("Available seats cannot exceed total seats.");
        }
        return errors;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        successBox.classList.remove("show");

        const data = {
            driver_name: form.driver_name.value.trim(),
            email: form.email.value.trim().toLowerCase(),
            phone: form.phone.value.trim(),
            from_location: form.from_location.value.trim(),
            to_location: form.to_location.value.trim(),
            departure_date: form.departure_date.value,
            departure_time: form.departure_time.value,
            arrival_time: form.arrival_time.value,
            price: Number(form.price.value),
            available_seats: Number(form.available_seats.value),
            total_seats: Number(form.total_seats.value),
        };

        const errors = validate(data);
        if (errors.length) {
            showFormError(errorBox, errors);
            errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        hideFormError(errorBox);
        setLoading(button, true, "Publishing ride...");

        try {
            const result = await api("/api/create-ride", { method: "POST", body: JSON.stringify(data) });
            saveUser({ id: result.driver.id, name: result.driver.name, email: data.email, phone: data.phone });

            successBox.innerHTML = `
                ✅ <strong>Your ride is live!</strong>
                ${escapeHtml(data.from_location)} → ${escapeHtml(data.to_location)} on ${formatDate(data.departure_date)}.
                <a href="/pages/ride-details.html?id=${result.ride.id}">View ride</a> •
                <a href="/index.html#rides">See all rides</a>`;
            successBox.classList.add("show");
            successBox.scrollIntoView({ behavior: "smooth", block: "center" });

            // clear the trip fields but keep the driver details for next time
            ["from_location", "to_location", "departure_date", "departure_time", "arrival_time", "price", "available_seats", "total_seats"].forEach(
                (field) => (form[field].value = "")
            );
        } catch (error) {
            showFormError(errorBox, error.details || error.message);
        } finally {
            setLoading(button, false);
        }
    });
}

// -----------------------------------------------------------------------------
// 7. RIDE DETAILS PAGE
// -----------------------------------------------------------------------------

function initRideDetailsPage() {
    const container = document.getElementById("ride-details");
    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
        container.innerHTML = statusMessageHtml("No ride selected", "Go back and pick a ride from the list.");
        return;
    }

    async function load() {
        container.innerHTML = loadingHtml("Loading ride...");
        try {
            const { ride } = await api(`/api/get-ride?id=${encodeURIComponent(id)}`);
            render(ride);
        } catch (error) {
            const title = error.status === 404 ? "Ride not found" : "Couldn't load this ride";
            container.innerHTML = statusMessageHtml(title, escapeHtml(error.message), "error");
        }
    }

    function render(ride) {
        document.title = `${ride.from_location} → ${ride.to_location} | RideMate`;
        const isFull = ride.available_seats <= 0 || ride.status !== "active";
        const rating = ride.driver.rating != null ? `⭐ ${ride.driver.rating.toFixed(1)}` : "🆕 New driver";

        container.innerHTML = `
            <div class="ride-card">
                <div class="driver">
                    <div class="avatar">${escapeHtml(initials(ride.driver.name))}</div>
                    <div>
                        <strong>${escapeHtml(ride.driver.name)}</strong><br>
                        <small>${rating} • ${ride.driver.total_rides} rides</small>
                    </div>
                </div>

                <div class="route">
                    <div class="route-line">
                        <div class="dot"></div><div class="line"></div><div class="dot"></div>
                    </div>
                    <div class="location">
                        <p>${escapeHtml(ride.from_location)} — ${formatTime(ride.departure_time)}</p>
                        <p>${escapeHtml(ride.to_location)}${ride.arrival_time ? ` — ${formatTime(ride.arrival_time)}` : ""}</p>
                    </div>
                </div>

                <div class="details-grid">
                    <div class="input-box"><label>DATE</label><p>${formatDate(ride.departure_date)}</p></div>
                    <div class="input-box"><label>SEATS LEFT</label><p>${ride.available_seats} of ${ride.total_seats}</p></div>
                    <div class="input-box"><label>STATUS</label><p>${escapeHtml(ride.status)}</p></div>
                </div>

                <div class="ride-footer">
                    <div class="price">${formatPrice(ride.price)} <small style="font-size:13px;color:#64748b">/ seat</small></div>
                    <button type="button" class="join" id="details-join" ${isFull ? "disabled" : ""}>
                        ${isFull ? "Ride Full" : "Join Ride"}
                    </button>
                </div>
            </div>`;

        document.getElementById("details-join").addEventListener("click", () => {
            openJoinModal(ride, () => load()); // reload to show the new seat count
        });
    }

    load();
}

// -----------------------------------------------------------------------------
// 8. MY BOOKINGS PAGE
// -----------------------------------------------------------------------------

async function initBookingsPage() {
    const list = document.getElementById("bookings-list");
    const saved = getSavedUser();

    if (!saved || !saved.id) {
        list.innerHTML = statusMessageHtml(
            "No bookings in this browser yet",
            "When you join a ride, your bookings will appear here. <a href='/index.html#rides' style='color:#38e8a5'>Find a ride</a>."
        );
        return;
    }

    document.getElementById("bookings-user").textContent = `Bookings for ${saved.name} (${saved.email})`;
    list.innerHTML = loadingHtml("Loading bookings...");

    try {
        const { bookings } = await api(`/api/get-bookings?user_id=${encodeURIComponent(saved.id)}`);
        if (bookings.length === 0) {
            list.innerHTML = statusMessageHtml(
                "No bookings yet",
                "<a href='/index.html#rides' style='color:#38e8a5'>Find a ride</a> to get started."
            );
            return;
        }
        list.innerHTML = bookings
            .map(
                (b) => `
                <div class="booking-item">
                    <div>
                        <strong>${escapeHtml(b.ride.from_location)} → ${escapeHtml(b.ride.to_location)}</strong><br>
                        <small>
                            📅 ${formatDate(b.ride.departure_date)}, ${formatTime(b.ride.departure_time)}
                            • Driver: ${escapeHtml(b.ride.driver_name)}
                            • ${b.seats} seat(s) • ${escapeHtml(b.status)}
                        </small>
                    </div>
                    <div class="price">${formatPrice(b.total_price)}</div>
                    <a href="/pages/ride-details.html?id=${b.ride.id}" class="join">View ride</a>
                </div>`
            )
            .join("");
    } catch (error) {
        list.innerHTML = statusMessageHtml("Couldn't load bookings", escapeHtml(error.message), "error");
    }
}

// -----------------------------------------------------------------------------
// 9. START: run the code for whichever page is open
// -----------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("rides-list")) initHomePage();
    if (document.getElementById("offer-form")) initOfferRidePage();
    if (document.getElementById("ride-details")) initRideDetailsPage();
    if (document.getElementById("bookings-list")) initBookingsPage();
});
