//script.js - Main JS for TechStore website

// 📦 Firebase SDK Imports (Auth + Firestore ONLY - Storage removed)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
import {
	getAuth,
	signInWithEmailAndPassword,
	onAuthStateChanged,
	signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
	getFirestore,
	collection,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	doc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"

// 🔑 Firebase Config (REPLACE WITH YOURS from Firebase Console)
const firebaseConfig = {
	apiKey: "AIzaSyBhsod6Titcn_ySmVAPmpiLqMO5BRhPoMA",
	authDomain: "techhive-billydev.firebaseapp.com",
	projectId: "techhive-billydev",
	/* storageBucket: "techhive-billydev.firebasestorage.app", */
	messagingSenderId: "510629716330",
	appId: "1:510629716330:web:a184c34541fc38a9680513",
	measurementId: "G-B1RM91YYTY",
}

// ⚙️ Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// 📊 State
let products = []
let currentUser = null

// 🎯 DOM Cache
const DOM = {
	loader: document.getElementById("loader"),
	featuredGrid: document.getElementById("featured-grid"),
	productsGrid: document.getElementById("products-grid"),
	noResults: document.getElementById("no-results"),
	adminTable: document.querySelector("#products-table tbody"),
	detailModal: document.getElementById("detail-modal"),
	modalBody: document.getElementById("modal-body"),
	formModal: document.getElementById("form-modal"),
	loginError: document.getElementById("login-error"),
	dashSuccess: document.getElementById("dash-success"),
	contactAlert: document.getElementById("contact-alert"),
	authLink: document.getElementById("auth-link"),
	logoutBtn: document.getElementById("logout-btn"),
	pImgPreview: document.getElementById("p-img-preview"),
	search: document.getElementById("search"),
	filterType: document.getElementById("filter-type"),
	filterBrand: document.getElementById("filter-brand"),
	filterCondition: document.getElementById("filter-condition"),
	sortPrice: document.getElementById("sort-price"),
	featuredSort: document.getElementById("featured-sort"),
}

// 🛠️ UI Helpers
const showLoader = () => DOM.loader.classList.remove("hidden")
const hideLoader = () => DOM.loader.classList.add("hidden")
const showAlert = (el, msg, type = "success") => {
	el.textContent = msg
	el.className = `alert alert-${type}`
	el.style.display = "block"
	// Trigger animation
	setTimeout(() => el.classList.add("show"), 10)
	// Hide after 5 seconds
	setTimeout(() => {
		el.classList.remove("show")
		setTimeout(() => (el.style.display = "none"), 400)
	}, 5000)
}
const formatPrice = (p) => `Ksh${p.toLocaleString()}`

// ⚡ Hide loader after 1s max
setTimeout(() => hideLoader(), 1000)

// 🔄 SPA Router
function navigateTo(page) {
	document
		.querySelectorAll(".page")
		.forEach((p) => p.classList.remove("active"))
	document.getElementById(page).classList.add("active")
	document
		.querySelectorAll(".nav-links a")
		.forEach((a) => a.classList.remove("active"))
	const activeLink = document.querySelector(`.nav-links a[data-page="${page}"]`)
	if (activeLink) activeLink.classList.add("active")

	if (page === "products") applyFilters()
	if (page === "admin-dashboard" && !currentUser) navigateTo("admin-login")
	if (page === "admin-dashboard") renderAdminTable()
	if (page === "home") renderFeatured()
}

// 🔐 Auth State Listener
onAuthStateChanged(auth, (user) => {
	currentUser = user
	if (user) {
		DOM.authLink.textContent = "Dashboard"
		DOM.authLink.dataset.page = "admin-dashboard"
		DOM.logoutBtn.classList.remove("hidden")
	} else {
		DOM.authLink.textContent = "Admin"
		DOM.authLink.dataset.page = "admin-login"
		DOM.logoutBtn.classList.add("hidden")
	}
})

// 📥 Load Public Data
async function loadProducts() {
	try {
		const snap = await getDocs(collection(db, "products"))
		products = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
		renderFeatured()
		applyFilters()
	} catch (err) {
		console.error("Firestore Load Error:", err)
		DOM.noResults.textContent = "Failed to load products. Check console."
		DOM.noResults.classList.remove("hidden")
	}
}

// 🖼️ Render Cards
function renderCards(items, container) {
	container.innerHTML = ""
	if (items.length === 0) {
		DOM.noResults.classList.remove("hidden")
		DOM.noResults.textContent = "No products match your filters."
		return
	}
	DOM.noResults.classList.add("hidden")

	items.forEach((p) => {
		const img =
			p.image || "https://placehold.co/600x400/1E293B/6366F1?text=No+Image"
		const card = document.createElement("div")
		card.className = "card"
		card.dataset.id = p.id
		card.innerHTML = `
      <div style="position:relative">
        <img src="${img}" class="card-img" loading="lazy" alt="${p.name}">
        <span class="badge">${p.condition}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${p.name}</div>
        <div style="color:var(--text-muted); font-size:0.85rem;">${p.brand} • ${p.ram} • ${p.storage}</div>
        <div class="card-price">${formatPrice(p.price)}</div>
        <button class="btn btn-secondary view-detail-btn" data-id="${p.id}">View Details</button>
      </div>`
		container.appendChild(card)
	})
}

function renderFeatured() {
	let featuredItems = [...products]
	const sortType = DOM.featuredSort.value

	// Apply sorting logic
	if (sortType === "name-asc") {
		featuredItems.sort((a, b) => a.name.localeCompare(b.name))
	} else if (sortType === "name-desc") {
		featuredItems.sort((a, b) => b.name.localeCompare(a.name))
	} else if (sortType === "oldest") {
		featuredItems.sort(
			(a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0),
		)
	} else if (sortType === "date-modified") {
		featuredItems.sort(
			(a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
		)
	} else {
		// Default: Newest first
		featuredItems.sort(
			(a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
		)
	}

	renderCards(featuredItems.slice(0, 4), DOM.featuredGrid)
}

// Featured Sort change listener
DOM.featuredSort.addEventListener("change", renderFeatured)

// 🔍 Filters & Sorting
function applyFilters() {
	const search = DOM.search.value.toLowerCase()
	const type = DOM.filterType.value
	const brand = DOM.filterBrand.value
	const cond = DOM.filterCondition.value
	const sort = DOM.sortPrice.value

	let filtered = products.filter((p) => {
		const matchSearch =
			p.name.toLowerCase().includes(search) ||
			p.brand.toLowerCase().includes(search)
		return (
			matchSearch &&
			(type === "all" || p.type === type) &&
			(brand === "all" || p.brand === brand) &&
			(cond === "all" || p.condition === cond)
		)
	})

	if (sort === "low-high") filtered.sort((a, b) => a.price - b.price)
	if (sort === "high-low") filtered.sort((a, b) => b.price - a.price)

	renderCards(filtered, DOM.productsGrid)
}

// ⚡ Event Delegation
document.addEventListener("click", (e) => {
	const target = e.target.closest("button, a")
	if (!target) return

	// Navigation
	if (target.matches(".nav-links a")) {
		e.preventDefault()
		navigateTo(target.dataset.page)
	}
	if (target.id === "browse-btn") navigateTo("products")

	// View Details
	if (target.matches(".view-detail-btn")) {
		const p = products.find((x) => x.id === target.dataset.id)
		if (!p) return
		const img =
			p.image || "https://placehold.co/600x400/1E293B/6366F1?text=No+Image"
		DOM.modalBody.innerHTML = `
      <img src="${img}" style="width:100%; border-radius:var(--radius); margin-bottom:1rem;">
      <h2>${p.name}</h2>
      <div class="flex" style="margin:0.5rem 0;">
        <span class="badge">${p.type}</span>
        <span class="badge" style="background:var(--surface); border:1px solid var(--border); color:var(--text);">${p.condition}</span>
      </div>
      <div style="background:var(--bg); padding:1rem; border-radius:var(--radius); margin:1rem 0;">
        <p><strong>Brand:</strong> ${p.brand}</p>
        <p><strong>Processor:</strong> ${p.cpu}</p>
        <p><strong>RAM:</strong> ${p.ram} | <strong>Storage:</strong> ${p.storage}</p>
      </div>
      <div style="font-size:1.5rem; color:var(--accent); font-weight:700; margin-bottom:1rem;">${formatPrice(p.price)}</div>
      <a href="https://wa.me/254740470381?text=${encodeURIComponent(`Hi, I'm interested in the ${p.name} (KSh ${p.price}) listed on TechStore. Is it available?`)}" target="_blank" class="btn btn-whatsapp">💬 Buy via WhatsApp</a>`
		DOM.detailModal.classList.add("open")
		document.body.classList.add("modal-open")
	}

	if (target.matches(".contact-buy-btn")) {
		DOM.detailModal.classList.remove("open")
		navigateTo("contact")
	}

	// Admin Table Actions
	if (target.matches(".edit-btn")) {
		const p = products.find((x) => x.id === target.dataset.id)
		if (!p) return
		document.getElementById("p-id").value = p.id
		document.getElementById("p-name").value = p.name
		document.getElementById("p-type").value = p.type
		document.getElementById("p-brand").value = p.brand
		document.getElementById("p-price").value = p.price
		document.getElementById("p-condition").value = p.condition
		document.getElementById("p-ram").value = p.ram
		document.getElementById("p-storage").value = p.storage
		document.getElementById("p-cpu").value = p.cpu
		DOM.pImgPreview.src =
			p.image || "https://placehold.co/600x400/1E293B/6366F1?text=No+Image"
		DOM.pImgPreview.classList.remove("hidden")
		document.getElementById("form-title").textContent = "Edit Product"
		DOM.formModal.classList.add("open")
	}

	if (target.matches(".del-btn")) {
		if (!confirm("Delete this product?")) return
		deleteProduct(target.dataset.id)
	}

	// Close Modals
	if (target.matches(".close-modal")) {
		target.closest(".modal").classList.remove("open")
		document.body.classList.remove("modal-open")
	}
})

// 📝 Admin CRUD
function renderAdminTable() {
	DOM.adminTable.innerHTML = ""
	products.forEach((p) => {
		const tr = document.createElement("tr")
		tr.innerHTML = `
      <td>${p.name}</td><td>${p.type}</td><td>${p.brand}</td><td>${formatPrice(p.price)}</td>
      <td>
        <button class="btn btn-secondary edit-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem;" data-id="${p.id}">Edit</button>
        <button class="btn btn-danger del-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem;" data-id="${p.id}">Delete</button>
      </td>`
		DOM.adminTable.appendChild(tr)
	})
}

async function deleteProduct(id) {
	showLoader()
	try {
		await deleteDoc(doc(db, "products", id))
		showAlert(DOM.dashSuccess, "Deleted successfully.")
		await loadProducts()
		renderAdminTable()
	} catch (err) {
		showAlert(DOM.dashSuccess, err.message, "error")
	} finally {
		hideLoader()
	}
}

document.getElementById("add-product-btn").addEventListener("click", () => {
	document.getElementById("product-form").reset()
	document.getElementById("p-id").value = ""
	document.getElementById("form-title").textContent = "Add Product"
	DOM.pImgPreview.classList.add("hidden")
	DOM.formModal.classList.add("open")
})

// 📤 Image Preview
document.getElementById("p-image").addEventListener("change", function (e) {
	const file = e.target.files[0]
	if (file) {
		const reader = new FileReader()
		reader.onload = (ev) => {
			DOM.pImgPreview.src = ev.target.result
			DOM.pImgPreview.classList.remove("hidden")
		}
		reader.readAsDataURL(file)
	}
})

// 💾 Save Product (Create/Update) - WITH CLOUDINARY
document
	.getElementById("product-form")
	.addEventListener("submit", async (e) => {
		e.preventDefault()
		showLoader()
		try {
			const file = document.getElementById("p-image").files[0]
			let imageUrl =
				DOM.pImgPreview.src ||
				"https://placehold.co/600x400/1E293B/6366F1?text=No+Image"

			// ☁️ CLOUDINARY UPLOAD
			if (file) {
				try {
					// ⚠️ REPLACE THESE WITH YOUR CLOUDINARY CREDENTIALS
					const CLOUD_NAME = "dil8nacay" // e.g., 'dxz123abc'
					const UPLOAD_PRESET = "billdev_preset" // e.g., 'techstore'

					const formData = new FormData()
					formData.append("file", file)
					formData.append("upload_preset", UPLOAD_PRESET)

					const res = await fetch(
						`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
						{
							method: "POST",
							body: formData,
						},
					)

					const data = await res.json()

					if (data.secure_url) {
						imageUrl = data.secure_url
					} else {
						throw new Error(data.error?.message || "Upload failed")
					}
				} catch (err) {
					console.error("Cloudinary Error:", err)
					showAlert(
						DOM.dashSuccess,
						"Image upload failed. Check console.",
						"error",
					)
					hideLoader()
					return
				}
			}

			const data = {
				name: document.getElementById("p-name").value,
				type: document.getElementById("p-type").value,
				brand: document.getElementById("p-brand").value,
				price: Number(document.getElementById("p-price").value),
				condition: document.getElementById("p-condition").value,
				ram: document.getElementById("p-ram").value,
				storage: document.getElementById("p-storage").value,
				cpu: document.getElementById("p-cpu").value,
				image: imageUrl,
				updatedAt: new Date().toISOString(),
			}

			const id = document.getElementById("p-id").value
			if (id) {
				await updateDoc(doc(db, "products", id), data)
				showAlert(DOM.dashSuccess, "Updated successfully.")
			} else {
				await addDoc(collection(db, "products"), data)
				showAlert(DOM.dashSuccess, "Added successfully.")
			}

			DOM.formModal.classList.remove("open")
			document.getElementById("product-form").reset()
			DOM.pImgPreview.classList.add("hidden")
			await loadProducts()
			if (
				document.getElementById("admin-dashboard").classList.contains("active")
			)
				renderAdminTable()
		} catch (err) {
			showAlert(DOM.dashSuccess, err.message, "error")
		} finally {
			hideLoader()
		}
	})

// 🔑 Login Form
document.getElementById("login-form").addEventListener("submit", async (e) => {
	e.preventDefault()
	showLoader()
	try {
		await signInWithEmailAndPassword(
			auth,
			document.getElementById("admin-email").value,
			document.getElementById("admin-pass").value,
		)
		navigateTo("admin-dashboard")
	} catch (err) {
		showAlert(DOM.loginError, err.message.replace("Firebase:", ""), "error")
	} finally {
		hideLoader()
	}
})

document.getElementById("logout-btn").addEventListener("click", async () => {
	await signOut(auth)
	navigateTo("home")
})

// 📞 Contact Form - FormSubmit Integration (NO API KEYS NEEDED!)
document
	.getElementById("contact-form")
	.addEventListener("submit", async (e) => {
		e.preventDefault()

		const name = document.getElementById("c-name").value.trim()
		const email = document.getElementById("c-email").value.trim()
		const message = document.getElementById("c-msg").value.trim()

		if (message.length < 10) {
			alert("Message too short. Please enter at least 10 characters.")
			return
		}

		showLoader()

		try {
			const formData = new FormData()
			formData.append("Name", name)
			formData.append("Email", email)
			formData.append("Message", message)
			formData.append(
				"_subject",
				"New Contact Form Message from TechStore Website",
			)
			formData.append("_captcha", "false")

			// ✅ Replace with your actual email address below
			const response = await fetch(
				"https://formsubmit.co/ajax/babsohaleem01@gmail.com",
				{
					method: "POST",
					body: formData,
				},
			)

			const result = await response.json()

			if (result.success) {
				e.target.reset()
				showAlert(
					DOM.contactAlert,
					`✅ Thank you ${name}! Your message has been sent successfully. We'll reply shortly.`,
					"success",
				)
			} else {
				throw new Error(result.message || "Server error")
			}
		} catch (error) {
			console.error("Contact Form Error:", error)
			showAlert(
				DOM.contactAlert,
				`❌ Failed to send message. Please try again or contact us directly via email/phone.`,
				"error",
			)
		} finally {
			hideLoader()
		}
	})

// 🌙 Theme Toggle
document.querySelector(".theme-toggle").addEventListener("click", () => {
	const next =
		document.documentElement.getAttribute("data-theme") === "dark"
			? "light"
			: "dark"
	document.documentElement.setAttribute("data-theme", next)
	localStorage.setItem("techstore_theme", next)
})

// 🔁 Filter Listeners
;["change", "input"].forEach((evt) => {
	;[
		DOM.search,
		DOM.filterType,
		DOM.filterBrand,
		DOM.filterCondition,
		DOM.sortPrice,
	].forEach((el) => {
		el.addEventListener(evt, applyFilters)
	})
})
document.getElementById("reset-filters").addEventListener("click", () => {
	;[
		DOM.search,
		DOM.filterType,
		DOM.filterBrand,
		DOM.filterCondition,
		DOM.sortPrice,
	].forEach((el) => {
		el.value = el.id === "sort-price" ? "default" : "all"
	})
	applyFilters()
})

// 🚀 Initialize
loadProducts()
navigateTo("home")
