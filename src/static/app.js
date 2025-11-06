document.addEventListener("DOMContentLoaded", () => {
  const capabilitiesList = document.getElementById("capabilities-list");
  const registerForm = document.getElementById("register-form");
  const emailInput = document.getElementById("email");
  const capabilityInput = document.getElementById("capability");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const filterPracticeArea = document.getElementById("filter-practice-area");
  const filterAvailability = document.getElementById("filter-availability");
  const registerModal = document.getElementById("register-container");
  const modalCloseBtn = document.querySelector(".modal-close");
  const cancelBtn = document.querySelector(".btn-cancel");

  let allCapabilities = {};

  // Modal control functions
  function openRegisterModal(capabilityName) {
    capabilityInput.value = capabilityName;
    registerModal.classList.remove("hidden");
  }

  function closeRegisterModal() {
    registerModal.classList.add("hidden");
    registerForm.reset();
    capabilityInput.value = "";
  }

  // Event listeners for modal controls
  modalCloseBtn.addEventListener("click", closeRegisterModal);
  cancelBtn.addEventListener("click", closeRegisterModal);
  registerModal.addEventListener("click", (e) => {
    if (e.target === registerModal) {
      closeRegisterModal();
    }
  });

  // Filter and search functionality
  function filterCapabilities() {
    const searchTerm = searchInput.value.toLowerCase();
    const practiceAreaFilter = filterPracticeArea.value;
    const availabilityFilter = filterAvailability.value;

    document.querySelectorAll(".capability-card").forEach((card) => {
      const capabilityName = card.querySelector("h4").textContent.toLowerCase();
      const description = card.textContent.toLowerCase();
      const practiceArea = card.getAttribute("data-practice-area");
      const capacity = parseInt(card.getAttribute("data-capacity"));
      const currentConsultants = parseInt(
        card.getAttribute("data-current-consultants")
      );

      // Search filter
      const matchesSearch =
        capabilityName.includes(searchTerm) || description.includes(searchTerm);

      // Practice area filter
      const matchesPracticeArea =
        !practiceAreaFilter || practiceArea === practiceAreaFilter;

      // Availability filter
      let matchesAvailability = true;
      if (availabilityFilter === "available") {
        matchesAvailability = capacity > 0;
      } else if (availabilityFilter === "full") {
        matchesAvailability = capacity === 0;
      }

      const shouldShow =
        matchesSearch && matchesPracticeArea && matchesAvailability;
      card.style.display = shouldShow ? "" : "none";
    });
  }

  searchInput.addEventListener("input", filterCapabilities);
  filterPracticeArea.addEventListener("change", filterCapabilities);
  filterAvailability.addEventListener("change", filterCapabilities);

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    try {
      const response = await fetch("/capabilities");
      allCapabilities = await response.json();

      // Clear loading message
      capabilitiesList.innerHTML = "";

      // Populate capabilities list
      Object.entries(allCapabilities).forEach(([name, details]) => {
        const capabilityCard = document.createElement("div");
        capabilityCard.className = "capability-card";
        capabilityCard.setAttribute("data-practice-area", details.practice_area);
        capabilityCard.setAttribute("data-capacity", details.capacity || 0);

        const currentConsultants = details.consultants
          ? details.consultants.length
          : 0;
        capabilityCard.setAttribute("data-current-consultants", currentConsultants);

        const availableCapacity = details.capacity || 0;

        // Create consultants HTML with delete icons
        const consultantsHTML =
          details.consultants && details.consultants.length > 0
            ? `<div class="consultants-section">
              <h5>Registered Consultants (${details.consultants.length}):</h5>
              <ul class="consultants-list">
                ${details.consultants
                  .map(
                    (email) =>
                      `<li><span class="consultant-email">${email}</span><button class="delete-btn" data-capability="${name}" data-email="${email}" type="button">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p class="empty-state">No consultants registered yet</p>`;

        capabilityCard.innerHTML = `
          <div class="capability-info">
            <h4>${name}</h4>
            <p>${details.description}</p>
            
            <div class="capability-meta">
              <span class="meta-item"><strong>Practice Area:</strong> ${details.practice_area}</span>
              <span class="meta-item"><strong>Capacity:</strong> ${availableCapacity} hrs/week</span>
              <span class="meta-item"><strong>Team:</strong> ${currentConsultants} consultants</span>
            </div>
            
            ${details.industry_verticals ? `<p><strong>Industries:</strong> ${details.industry_verticals.join(", ")}</p>` : ""}
            
            <div class="consultants-container">
              ${consultantsHTML}
            </div>
          </div>
          
          <div class="capability-actions">
            <button class="btn-register" data-capability="${name}" type="button">Register Expertise</button>
          </div>
        `;

        capabilitiesList.appendChild(capabilityCard);

        // Add event listener to register button
        const registerBtn = capabilityCard.querySelector(".btn-register");
        registerBtn.addEventListener("click", () => {
          openRegisterModal(name);
        });
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Initial filter to show all
      filterCapabilities();
    } catch (error) {
      capabilitiesList.innerHTML =
        "<p>Failed to load capabilities. Please try again later.</p>";
      console.error("Error fetching capabilities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value;
    const capability = capabilityInput.value;

    if (!email || !capability) {
      messageDiv.textContent = "Please fill in all fields";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/register?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        registerForm.reset();
        closeRegisterModal();

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Initialize app
  fetchCapabilities();
});
