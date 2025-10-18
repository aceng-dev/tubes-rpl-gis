import { createClient } from "@supabase/supabase-js";
import L from "leaflet";

// 🔹 Koneksi ke Supabase
const supabase = createClient(
  "https://pmrcirhnptduntmobmrq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcmNpcmhucHRkdW50bW9ibXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjUyOTIsImV4cCI6MjA3NTc0MTI5Mn0.U84lEIAMGeETYuysTleWXI3f_WUi-2koT5yvkc5RPZk"
);

// 🔹 Batas koordinat peta
const Sw = L.latLng(-1.004896265670877, 119.79566929941795);
const Ne = L.latLng(-0.738935319559621, 119.93359106677627);
const bounds = L.latLngBounds(Sw, Ne);

// 🔹 Variabel global map
let map;
const myIcon = L.icon({
  iconUrl: "../FOTO/LOCATION.png",
  iconSize: [40, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// 🔹 Inisialisasi peta
function addMap() {
  map = L.map("map", {
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 13,
    center: [-0.9002633930253064, 119.87806390327438],
    zoom: 13,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// 🔹 Ambil semua marker awal (semua toko)
async function loadMarkers() {
 const { data, error } = await supabase
  .from("toko")
  .select(`
    id_toko,
    nama_toko,
    alamat,
    latitude,
    longtitude, 
    toko_brand ( 
      brand (
        id_brand,
        nama_brand,
        jenis_brand
      )
    )
  `);


  if (error) {
    console.error("Gagal ambil data:", error);
    alert("Error: " + JSON.stringify(error, null, 2));
    return;
  }

  console.log("Data dari Supabase (Semua Toko):", data);

  data.forEach((toko) => {
    const marker = L.marker([toko.latitude, toko.longtitude], { icon: myIcon }).addTo(map);

    const brandList =
      toko.toko_brand?.map((b) => `${b.brand.nama_brand} (${b.brand.jenis_brand})`).join(", ") ||
      "Tidak ada brand";

    const popupContent = `
      <b>${toko.nama_toko}</b><br>
      ${toko.alamat}<br>
      <i>Brand: ${brandList}</i>
    `; // Menghapus tag <img>
    marker.bindPopup(popupContent);
  });
}
// ------------------------------------------------------------------

// 🔹 Ambil daftar brand dan isi dropdown
async function initBrandDropdown() {
  const { data: brands, error } = await supabase
    .from("brand")
    .select("id_brand, nama_brand");

  if (error) {
    console.error("Gagal ambil data brand:", error);
    return;
  }

  const dropdownMenu = document.querySelector(".dropdown-menu");
  dropdownMenu.innerHTML = "";

  // Tambahkan opsi "Tampilkan Semua"
  const liAll = document.createElement("li");
  const aAll = document.createElement("a");
  aAll.classList.add("dropdown-item", "fw-bold");
  aAll.textContent = "Tampilkan Semua Toko";
  aAll.href = "#";
  aAll.dataset.idBrand = "all";
  liAll.appendChild(aAll);
  dropdownMenu.appendChild(liAll);
  dropdownMenu.appendChild(document.createElement("hr")); // Pemisah

  brands.forEach((brand) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.textContent = brand.nama_brand;
    a.href = "#";
    a.dataset.idBrand = brand.id_brand; // id_brand diset sebagai string
    li.appendChild(a);
    dropdownMenu.appendChild(li);
  });

  // event listener klik brand (Perbaikan di sini menggunakan parseInt)
  dropdownMenu.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const idBrandString = e.target.dataset.idBrand; // String dari HTML

      if (idBrandString === "all") {
        // Jika memilih "Tampilkan Semua"
        await clearMarkers();
        await loadMarkers();
      } else {
        // Konversi string ke integer sebelum memanggil fungsi filter
        const idBrand = parseInt(idBrandString); 
        if (!isNaN(idBrand)) {
          await loadTokoByBrand(idBrand);
        } else {
          console.error("ID Brand tidak valid:", idBrandString);
        }
      }
    });
  });
}

// Fungsi untuk menghapus semua marker dari peta
async function clearMarkers() {
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
}


// 🔹 Ambil toko berdasarkan id_brand (Kode Fiks dengan filter .eq() dan join)
async function loadTokoByBrand(idBrand) {
  await clearMarkers();

  console.log("Mencari toko untuk Brand ID (Integer):", idBrand); // Pastikan ini adalah angka

  const { data, error } = await supabase
    .from("toko")
    .select(`
      id_toko,
      nama_toko,
      alamat,
      latitude,
      longtitude, 
      toko_brand!inner ( 
        brand (
          id_brand,
          nama_brand,
          jenis_brand
        )
      )
    `)
    // Filter di tabel penghubung menggunakan ID yang sudah di-parse ke integer
    .eq("toko_brand.id_brand", idBrand); 

  if (error) {
    console.error("Gagal ambil data toko berdasarkan brand:", error);
    alert("Error: " + JSON.stringify(error, null, 2));
    return;
  }

  console.log("Data Toko Ditemukan untuk filter:", data); 

  if (!data || data.length === 0) {
    alert("Tidak ada toko yang menjual brand ini");
    return;
  }

  data.forEach((toko) => {
    const marker = L.marker([toko.latitude, toko.longtitude], { icon: myIcon }).addTo(map);

    const brandList =
      toko.toko_brand?.map((b) => `${b.brand.nama_brand} (${b.brand.jenis_brand})`).join(", ") ||
      "Tidak ada brand";

    const popupContent = `
      <b>${toko.nama_toko}</b><br>
      ${toko.alamat}<br>
      <i>Brand: ${brandList}</i>
    `;
    marker.bindPopup(popupContent);
  });
}


// 🔹 Jalankan semuanya
document.addEventListener("DOMContentLoaded", () => {
  addMap();
  loadMarkers(); // tampilkan semua marker dulu
  initBrandDropdown(); // aktifkan filter dropdown
});