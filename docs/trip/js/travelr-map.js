// travelr-map.js
class TravelrMap {
  constructor({ apiKey, mapId, placeIds }) {
    this.apiKey = apiKey;
    this.mapId = mapId;
    this.placeIds = placeIds;

    this.map = null;
    this.sidebar = null;
    this.sidebarElems = {};

    this.injectCSS();
  }

  // Inject CSS dynamically
  injectCSS() {
    const style = document.createElement("style");
    style.textContent = `
      html, body { height: 100%; margin: 0; padding: 0; font-family: -apple-system, '.SFNSText-Regular', 'San Francisco', 'Oxygen', 'Ubuntu', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif; }
      #map { width: 100%; height: 100vh; }
      h2 { margin: 0; }
      .sidebar { position: fixed; bottom: 80px; left: 0; right: 0; background: #fff; padding: 1em; overflow: hidden; z-index: 3; }
      #sidebar:not(.open) { display: none; transform: translateY(-3rem); opacity: 0; transition: all 0.3s ease; }
      #sidebar.open { display: block; transform: translateY(0); opacity: 1; }
      #directions-btn { display: block; margin-top: 10px; padding: 8px; background: #0000f7; color: white; border: none; cursor: pointer; width: 100%; text-align: center; }
      #directions-btn:hover { background: #8080FB; }
      .close-btn { position: absolute; top: -0.5rem; right: 0; padding: 1rem; font-size: 2rem; text-align: right; cursor: pointer; color: #999; }
    `;
    document.head.appendChild(style);
  }

  async fetchPlace(placeId) {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,formattedAddress,location,internationalPhoneNumber,websiteUri,rating`;
    try {
      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": "displayName,formattedAddress,location,internationalPhoneNumber,websiteUri,rating",
        },
      });
      if (!res.ok) {
        console.error("Error fetching place:", placeId, res.statusText);
        return null;
      }
      return res.json();
    } catch (e) {
      console.error("Fetch error for place:", placeId, e);
      return null;
    }
  }

  renderSidebar() {
    if (document.getElementById("sidebar")) return;

    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "sidebar";

    sidebarContainer.innerHTML = `
      <div class="sidebar">
        <div class="close-btn" id="sidebar-close">&times;</div>
        <h2 id="place-name">Select a marker</h2>
        <p id="place-address"></p>
        <p id="place-phone"></p>
        <p id="place-rating"></p>
        <a id="place-website" href="#" target="_blank"></a>
        <button id="directions-btn">Get Directions</button>
      </div>
    `;

    document.body.appendChild(sidebarContainer);

    this.sidebar = sidebarContainer;
    this.sidebarElems = {
      name: document.getElementById("place-name"),
      address: document.getElementById("place-address"),
      phone: document.getElementById("place-phone"),
      rating: document.getElementById("place-rating"),
      website: document.getElementById("place-website"),
      directionsBtn: document.getElementById("directions-btn"),
      closeBtn: document.getElementById("sidebar-close"),
    };

    this.sidebarElems.closeBtn.addEventListener("click", () => {
      this.sidebar.classList.remove("open");
    });
  }

  async init(containerId) {
    this.renderSidebar();

    this.map = new google.maps.Map(document.getElementById(containerId), {
      center: { lat: 20, lng: 0 },
      zoom: 2,
      mapId: this.mapId,
    });

    const bounds = new google.maps.LatLngBounds();

    for (const id of this.placeIds) {
      const place = await this.fetchPlace(id);
      if (!place || !place.location) continue;

      const pos = { lat: place.location.latitude, lng: place.location.longitude };

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position: pos,
        title: place.displayName?.text || "Unknown Place",
      });

      marker.addListener("click", () => {
        this.sidebar.classList.add("open");
        this.sidebarElems.name.textContent = place.displayName?.text || "Unknown Place";
        this.sidebarElems.address.textContent = place.formattedAddress || "";
        this.sidebarElems.phone.textContent = place.internationalPhoneNumber || "";
        this.sidebarElems.rating.textContent = place.rating ? `⭐ ${place.rating} / 5` : "No rating";

        if (place.websiteUri) {
          this.sidebarElems.website.textContent = place.websiteUri;
          this.sidebarElems.website.href = place.websiteUri;
        } else {
          this.sidebarElems.website.textContent = "";
          this.sidebarElems.website.removeAttribute("href");
        }

        this.sidebarElems.directionsBtn.onclick = () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const destLat = place.location.latitude;
                const destLng = place.location.longitude;
                const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${destLat},${destLng}`;
                window.open(url, "_blank");
              },
              () => alert("Could not get your location. Please allow location access.")
            );
          } else {
            alert("Geolocation is not supported by your browser.");
          }
        };
      });

      bounds.extend(pos);
    }

    if (!bounds.isEmpty()) this.map.fitBounds(bounds);
  }
}
