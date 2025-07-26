const firebaseConfig = {
  apiKey: "AIzaSyBQkfy-WUWAP0O7hZyi_yqvOcg9vlrkFbY",
  authDomain: "vster-69f85.firebaseapp.com",
  databaseURL: "https://vster-69f85-default-rtdb.firebaseio.com",
  projectId: "vster-69f85",
  storageBucket: "vster-69f85.appspot.com",
  messagingSenderId: "332765437206",
  appId: "1:332765437206:web:4903595014ed6d0fc10fc5"
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const auth = firebase.auth();

const movieId = new URLSearchParams(window.location.search).get("id");
let currentUser;

auth.onAuthStateChanged(user => {
  if (!user) return (location.href = "auth.html");
  currentUser = user;
  loadMovie();
  loadComments();
  loadStats();
});

function loadMovie() {
  db.ref("movies/" + movieId).once("value", snap => {
    const data = snap.val();
    if (!data) return alert("Movie not found");

    document.getElementById("title").textContent = data.title;
    document.getElementById("poster").src = data.image;
    document.getElementById("description").textContent = data.description;
    document.getElementById("type").textContent = data.type || "Single";
    document.getElementById("verified").textContent = data.verified ? "✅" : "❌";

    // Count view
    db.ref(`movies/${movieId}/views/${currentUser.uid}`).set(true);

    // Show trailer
    if (data.trailer && data.trailer.includes("youtube")) {
      document.getElementById("trailer").src = data.trailer.replace("watch?v=", "embed/");
    } else {
      document.getElementById("trailer").style.display = "none";
    }

    // Check payment
    if (data.locked) {
      db.ref(`users/${currentUser.uid}/purchases/${movieId}`).once("value", paid => {
        if (paid.exists()) showDownloads(data);
        else showPayment(data);
      });
    } else {
      showDownloads(data);
    }
  });
}

function showPayment(data) {
  document.getElementById("priceInfo").textContent = `🎫 This movie costs ${data.price} BodaCash`;
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "💰 Pay to Unlock";
  btn.onclick = () => payMovie(data);
  document.getElementById("paySection").appendChild(btn);
}

function payMovie(data) {
  const userRef = db.ref("users/" + currentUser.uid);
  userRef.once("value", snap => {
    const wallet = snap.val().wallet || 0;
    if (wallet >= data.price) {
      userRef.update({ wallet: wallet - data.price });
      db.ref(`users/${currentUser.uid}/purchases/${movieId}`).set(true);
      alert("Payment successful!");
      location.reload();
    } else {
      alert("Not enough BodaCash.");
    }
  });
}

function showDownloads(data) {
  const box = document.getElementById("downloadSection");
  box.style.display = "block";
  box.innerHTML = "";

  if (Array.isArray(data.episodes)) {
    data.episodes.forEach((ep, i) => {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = ep.link;
      a.target = "_blank";
      a.textContent = ep.title || `Episode ${i + 1}`;
      box.appendChild(a);
    });
  } else if (data.link) {
    const a = document.createElement("a");
    a.className = "btn";
    a.href = data.link;
    a.target = "_blank";
    a.textContent = "🎬 Download Movie";
    box.appendChild(a);
  }
}

function saveToWatchlist() {
  db.ref(`users/${currentUser.uid}/watchlist/${movieId}`).set(true);
  alert("🎉 Saved to Watchlist!");
}

function shareMovie() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert("🔗 Link copied! Share with friends.");
  });
}

function likeMovie() {
  db.ref(`movies/${movieId}/likes/${currentUser.uid}`).set(true);
  alert("❤️ Liked!");
}

function reportMovie() {
  const reason = prompt("Why are you reporting this movie?");
  if (reason) {
    db.ref(`reports/movies/${movieId}`).push({ reason, user: currentUser.uid, time: Date.now() });
    alert("🚨 Report submitted. Thank you.");
  }
}

function submitRating() {
  const val = document.getElementById("ratingSelect").value;
  if (!val) return alert("Please select a rating.");
  db.ref(`movies/${movieId}/ratings/${currentUser.uid}`).set(parseInt(val));
  alert("✅ Rating submitted!");
}

function submitComment() {
  const comment = document.getElementById("commentInput").value.trim();
  if (!comment) return alert("Write something first.");
  db.ref(`movies/${movieId}/comments`).push({
    uid: currentUser.uid,
    text: comment,
    time: Date.now()
  });
  document.getElementById("commentInput").value = "";
  loadComments();
}

function loadComments() {
  db.ref(`movies/${movieId}/comments`).limitToLast(20).once("value", snap => {
    const list = document.getElementById("commentList");
    list.innerHTML = "";
    snap.forEach(c => {
      const d = c.val();
      const div = document.createElement("div");
      div.className = "review-box";
      div.innerHTML = `🗨️ ${d.text}`;
      list.appendChild(div);
    });
  });
}

function loadStats() {
  const statsRef = db.ref(`movies/${movieId}`);
  statsRef.child("views").once("value", vSnap => {
    const viewCount = vSnap.numChildren();
    statsRef.child("likes").once("value", lSnap => {
      const likes = lSnap.exists() ? Object.keys(lSnap.val()).length : 0;
      statsRef.child("ratings").once("value", rSnap => {
        const ratings = Object.values(rSnap.val() || {});
        const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;

        document.getElementById("viewCount").textContent = viewCount;
        document.getElementById("likeCount").textContent = likes;
        document.getElementById("avgRating").textContent = avg;
      });
    });
  });
}