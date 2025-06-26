// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(reg) {
            console.log('ServiceWorker registered:', reg.scope);
        }, function(err) {
            console.log('ServiceWorker registration failed:', err);
        });
    });
}

// --- Medical Info ---
function loadMedicalInfo() {
    const info = JSON.parse(localStorage.getItem('medicalInfo')) || {
        name: 'Not set',
        blood: 'Not set',
        allergies: 'None',
        conditions: 'None'
    };
    document.getElementById('medicalInfoContent').innerHTML = `
        <b>Name:</b> ${info.name}<br>
        <b>Blood Group:</b> ${info.blood}<br>
        <b>Allergies:</b> ${info.allergies}<br>
        <b>Conditions:</b> ${info.conditions}
    `;
}
function editMedicalInfo() {
    const info = JSON.parse(localStorage.getItem('medicalInfo')) || {};
    showModal(`
        <h2>Edit Medical Info</h2>
        <form id="medicalForm">
            <label>Name</label>
            <input type="text" name="name" value="${info.name||''}" required>
            <label>Blood Group</label>
            <input type="text" name="blood" value="${info.blood||''}" required>
            <label>Allergies</label>
            <input type="text" name="allergies" value="${info.allergies||''}">
            <label>Conditions</label>
            <input type="text" name="conditions" value="${info.conditions||''}">
            <button type="submit" class="emergency-btn">Save</button>
            <button type="button" class="edit-btn" onclick="closeModal()">Cancel</button>
        </form>
    `);
    document.getElementById('medicalForm').onsubmit = function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(this));
        localStorage.setItem('medicalInfo', JSON.stringify(data));
        closeModal();
        loadMedicalInfo();
    };
}

// --- Emergency Contacts ---
function loadContacts() {
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [
        {name: 'Family', phone: '9876543210'}
    ];
    const ul = document.getElementById('contactsList');
    ul.innerHTML = '';
    contacts.forEach((c, i) => {
        ul.innerHTML += `<li><b>${c.name}:</b> <a href="tel:${c.phone}">${c.phone}</a></li>`;
    });
}
function editContacts() {
    const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
    let html = `<h2>Edit Contacts</h2>
        <form id="contactsForm">`;
    contacts.forEach((c, i) => {
        html += `
            <label>Name</label>
            <input type="text" name="name${i}" value="${c.name}" required>
            <label>Phone</label>
            <input type="tel" name="phone${i}" value="${c.phone}" required>
            <button type="button" class="edit-btn" onclick="removeContact(${i})">Remove</button>
            <hr>
        `;
    });
    html += `
        <button type="button" class="edit-btn" onclick="addContactField()">Add Contact</button>
        <div id="extraContacts"></div>
        <button type="submit" class="emergency-btn">Save</button>
        <button type="button" class="edit-btn" onclick="closeModal()">Cancel</button>
        </form>
    `;
    showModal(html);
    document.getElementById('contactsForm').onsubmit = function(e) {
        e.preventDefault();
        const data = new FormData(this);
        let newContacts = [];
        for (let [key, value] of data.entries()) {
            if (key.startsWith('name')) {
                let idx = key.replace('name','');
                let phone = data.get('phone'+idx);
                if (value && phone) newContacts.push({name: value, phone: phone});
            }
        }
        localStorage.setItem('emergencyContacts', JSON.stringify(newContacts));
        closeModal();
        loadContacts();
    };
    window.addContactField = function() {
        const div = document.getElementById('extraContacts');
        const idx = document.querySelectorAll('input[name^="name"]').length;
        div.innerHTML += `
            <label>Name</label>
            <input type="text" name="name${idx}" required>
            <label>Phone</label>
            <input type="tel" name="phone${idx}" required>
            <hr>
        `;
    };
    window.removeContact = function(i) {
        contacts.splice(i,1);
        localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
        closeModal();
        editContacts();
    };
}

// --- Emergency SMS with Location ---
function sendEmergencySMS() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported!');
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const contacts = JSON.parse(localStorage.getItem('emergencyContacts')) || [];
        if (contacts.length === 0) {
            alert('No emergency contacts set!');
            return;
        }
        const phone = contacts[0].phone;
        const msg = encodeURIComponent(`I need help! My location: https://maps.google.com/?q=${lat},${lon}`);
        window.location.href = `sms:${phone}?body=${msg}`;
    }, function() {
        alert('Could not get location.');
    });
}

// --- Share Live Location ---
function shareLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported!');
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const url = `https://maps.google.com/?q=${lat},${lon}`;
        if (navigator.share) {
            navigator.share({
                title: 'My Live Location',
                text: 'Here is my current location:',
                url: url
            });
        } else {
            prompt('Copy and share this location:', url);
        }
    }, function() {
        alert('Could not get location.');
    });
}

// --- Siren ---
let sirenPlaying = false;
function toggleSiren() {
    const audio = document.getElementById('sirenAudio');
    if (!sirenPlaying) {
        audio.play();
        sirenPlaying = true;
    } else {
        audio.pause();
        audio.currentTime = 0;
        sirenPlaying = false;
    }
}

// --- Flashlight ---
let flashlightOn = false;
let track = null;
async function toggleFlashlight() {
    if (!('mediaDevices' in navigator)) {
        alert('Flashlight not supported!');
        return;
    }
    if (!flashlightOn) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            track = stream.getVideoTracks()[0];
            await track.applyConstraints({ advanced: [{ torch: true }] });
            flashlightOn = true;
        } catch (e) {
            alert('Could not turn on flashlight.');
        }
    } else {
        if (track) {
            track.stop();
            flashlightOn = false;
        }
    }
}

// --- Modal ---
function showModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// --- Init ---
window.onload = function() {
    loadMedicalInfo();
    loadContacts();
    // Modal close on click outside
    document.getElementById('modal').onclick = function(e) {
        if (e.target === this) closeModal();
    };
};