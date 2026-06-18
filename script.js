console.log("▶️ Le fichier script.js a bien démarré !");

// ==========================================
// 1. IMPORTATION DE FIREBASE
// ==========================================
import { initializeApp } from "https://unpkg.com/firebase@10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } 
from "https://unpkg.com/firebase@10.7.1/firebase-firestore.js";

// ==========================================
// 2. CONFIGURATION FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDmOiHUetoxS2Yzyou-rzehbPTIHmPrU6Q",
    authDomain: "dash-board-maison.firebaseapp.com",
    projectId: "dash-board-maison",
    storageBucket: "dash-board-maison.firebasestorage.app",
    messagingSenderId: "284538658677",
    appId: "1:284538658677:web:d044a7435d12467bbfbd3c"
};

let app, db;
try {
    console.log("🔄 Tentative d'initialisation de Firebase...");
    app = initializeApp(firebaseConfig);
    console.log("✅ app Firebase initialisée avec succès !");
    
    db = getFirestore(app);
    console.log("✅ getFirestore a fonctionné !");
} catch (e) {
    document.getElementById('list-loader').textContent = "Erreur de configuration Firebase.";
    console.error("❌ ERREUR FIREBASE AU DÉMARRAGE :", e);
}

// ==========================================
// 3. GESTION DE LA LISTE DE COURSES
// ==========================================
const shoppingListEl = document.getElementById('shopping-list');
const shoppingInput = document.getElementById('shopping-input');
const addBtn = document.getElementById('add-item-btn');
const loader = document.getElementById('list-loader');

if (db) {
    console.log("📡 Connexion à la collection 'courses'...");
    const coursesRef = collection(db, "courses");
    const q = query(coursesRef, orderBy("createdAt", "asc"));

    onSnapshot(q, (snapshot) => {
        console.log("📥 Données reçues depuis Firebase !");
        loader.style.display = 'none';
        shoppingListEl.innerHTML = ''; 
        
        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            
            const li = document.createElement('li');
            li.className = `shopping-item ${item.checked ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" ${item.checked ? 'checked' : ''} class="check-box">
                <span>${item.text}</span>
                <button class="delete-btn">×</button>
            `;

            li.querySelector('.check-box').addEventListener('change', async (e) => {
                await updateDoc(doc(db, "courses", id), { checked: e.target.checked });
            });

            li.querySelector('.delete-btn').addEventListener('click', async () => {
                await deleteDoc(doc(db, "courses", id));
            });

            shoppingListEl.appendChild(li);
        });
    }, (error) => {
        console.error("❌ ERREUR ONSNAPSHOT :", error);
        if (error.code === 'permission-denied') {
            loader.innerHTML = `
                <span style="color:#d93025; font-weight:bold;">Accès refusé !</span><br>
                Vous devez publier les règles "Mode Test" dans Firestore.
            `;
        } else {
             loader.textContent = "Erreur de chargement de la liste.";
        }
    });

    const addItemToDb = async () => {
        const text = shoppingInput.value.trim();
        if (text !== '') {
            try {
                await addDoc(coursesRef, {
                    text: text,
                    checked: false,
                    createdAt: new Date()
                });
                shoppingInput.value = ''; 
            } catch (e) {
                console.error("❌ ERREUR AJOUT ARTICLE :", e);
                if(e.code === 'permission-denied'){
                    alert("Impossible d'ajouter : Activez le Mode Test dans Firestore.");
                }
            }
        }
    };

    addBtn.addEventListener('click', addItemToDb);
    shoppingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItemToDb();
    });
} else {
    console.warn("⚠️ Base de données non connectée, la liste de courses est désactivée.");
}

// ==========================================
// 4. GESTION HEURE & DATE
// ==========================================
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    let dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}
setInterval(updateClock, 1000); 
updateClock(); 

// ==========================================
// 5. GESTION MÉTÉO (OpenWeatherMap)
// ==========================================
const OWM_API_KEY = '47c727b5e192b4fc5c837bc25007c07e';
let currentCityQuery = 'Pau,fr'; 

async function fetchCurrentWeather(cityQuery) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityQuery}&appid=${OWM_API_KEY}&units=metric&lang=fr`;
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("Ville introuvable");
        const data = await res.json();
        
        document.getElementById('current-city-name').textContent = data.name;
        document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
        document.getElementById('weather-desc').textContent = data.weather[0].description;
        document.getElementById('weather-minmax').textContent = `Min: ${Math.round(data.main.temp_min)}° Max: ${Math.round(data.main.temp_max)}°`;
    } catch (e) {
        console.error("Erreur météo actuelle:", e);
        document.getElementById('weather-desc').textContent = "Erreur de chargement";
    }
}

fetchCurrentWeather(currentCityQuery);
setInterval(() => fetchCurrentWeather(currentCityQuery), 3600000); 

// ==========================================
// 6. GESTION DE LA MODALE MÉTÉO
// ==========================================
const weatherWidget = document.getElementById('weather-widget');
const weatherModal = document.getElementById('weather-modal');
const closeModalBtn = document.getElementById('close-modal');
const citySelect = document.getElementById('city-select');
const forecastContainer = document.getElementById('forecast-container');
const forecastLoader = document.getElementById('forecast-loader');

weatherWidget.addEventListener('click', () => {
    weatherModal.style.display = 'flex';
    fetchForecast(citySelect.value);
});

closeModalBtn.addEventListener('click', () => { weatherModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === weatherModal) weatherModal.style.display = 'none';
});

citySelect.addEventListener('change', (e) => {
    const selectedCity = e.target.value;
    fetchForecast(selectedCity);
    currentCityQuery = selectedCity;
    fetchCurrentWeather(selectedCity);
});

async function fetchForecast(cityQuery) {
    forecastLoader.style.display = 'block';
    forecastContainer.innerHTML = '';
    
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${cityQuery}&appid=${OWM_API_KEY}&units=metric&lang=fr`;
    
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("Erreur prévisions");
        const data = await res.json();
        
        const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));
        
        forecastLoader.style.display = 'none';
        
        dailyForecasts.forEach(day => {
            const dateObj = new Date(day.dt * 1000);
            const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const dateDisplay = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}`;
            
            const iconCode = day.weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
            
            const card = document.createElement('div');
            card.className = 'forecast-day';
            card.innerHTML = `
                <div class="forecast-date">${dateDisplay}</div>
                <img class="forecast-icon" src="${iconUrl}" alt="icone météo">
                <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
                <div class="forecast-desc">${day.weather[0].description}</div>
            `;
            forecastContainer.appendChild(card);
        });
    } catch (e) {
        console.error("Erreur prévisions:", e);
        forecastLoader.textContent = "Impossible de charger les prévisions.";
    }
}
