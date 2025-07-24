let currentStep = 0;
const steps = document.querySelectorAll('.step');
const totalSteps = steps.length - 1; // Keep this line (thank-you is excluded)

// Initialize progress bar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateProgressBar();
});

function validateStep(stepIndex) {
  // Step 0: Name
  if (stepIndex === 0) {
    const nameField = document.getElementById('name');
    const nameError = document.getElementById('nameError');
    const nameValue = nameField.value.trim();
    const nameRegex = /^[A-Za-z ]+$/; // Only letters and spaces
  
    if (!nameValue) {
      nameError.textContent = "Please enter your name.";
      nameError.style.display = "block";
      return;
    } else if (!nameRegex.test(nameValue)) {
      nameError.textContent = "Name can only contain letters and spaces.";
      nameError.style.display = "block";
      return;
    } else {
      nameError.style.display = "none";
    }
  }

  // Step 1: Relation
  if (stepIndex === 1) {
    const relationField = document.getElementById('relation');
    const relationError = document.getElementById('relationError');
    const relationValue = relationField.value.trim();
    const relationRegex = /^[A-Za-z ]+$/; // Only letters and spaces
  
    if (!relationValue) {
      relationError.textContent = "Please enter your relation with the client.";
      relationError.style.display = "block";
      return;
    } else if (!relationRegex.test(relationValue)) {
      relationError.textContent = "Relation can only contain letters and spaces.";
      relationError.style.display = "block";
      return;
    } else {
      relationError.style.display = "none";
    }
  }

  // Step 2: Medicaid
  if (stepIndex === 2) {
    const medicaidDropdown = document.getElementById('medicaid');
    const medicaidError = document.getElementById('medicaidError');
    if (!medicaidDropdown || !medicaidError) return;

    if (medicaidDropdown.value === "") {
      medicaidError.textContent = "Please select an option.";
      medicaidError.style.display = "block";
      return;
    } else {
      medicaidError.style.display = "none";
    }
  }

  // Step 3: Phone/Email
  if (stepIndex === 3) {
    const phoneField = document.getElementById('phone');
    const emailField = document.getElementById('email');
    const phoneError = document.getElementById('phoneError');
    const emailError = document.getElementById('emailError');
    if (!phoneField || !emailField) return;

    // Reset errors
    phoneError.style.display = "none";
    emailError.style.display = "none";

    // Check at least one contact is filled
    if (!phoneField.value.trim() && !emailField.value.trim()) {
      phoneError.textContent = "Please provide at least Phone or Email.";
      phoneError.style.display = "block";
      return;
    }

    // Validate phone number format
    if (phoneField.value.trim()) {
      const phoneValue = phoneField.value.trim();
      const plainDigits = /^[0-9]{10}$/;            // 10 digits, no dashes
      const dashedFormat = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/; // 123-456-7890

      if (!plainDigits.test(phoneValue) && !dashedFormat.test(phoneValue)) {
        phoneError.textContent = "Please enter a valid phone (1234567890 or 123-456-7890).";
        phoneError.style.display = "block";
        return;
      }
    }

    // Validate email
    if (emailField.value.trim() && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(emailField.value.trim())) {
      emailError.textContent = "Please enter a valid email address.";
      emailError.style.display = "block";
      return;
    }
  }

  // Move to next step if validation passes
  nextStep();
}

// Move to the next step
function nextStep() {
  if (currentStep < totalSteps) {
    steps[currentStep].classList.remove('active');
    currentStep++;
    steps[currentStep].classList.add('active');
    updateProgressBar();
  }
}

// Move to the previous step
function prevStep() {
  if (currentStep > 0) {
    steps[currentStep].classList.remove('active');
    currentStep--;
    steps[currentStep].classList.add('active');
    updateProgressBar();
  }
}

// Update the progress bar and step indicator
function updateProgressBar() {
  const progressBar = document.getElementById('progressBar');
  const stepIndicator = document.getElementById('stepIndicator');

  if (currentStep >= totalSteps) {
    // On thank-you screen, show full progress
    progressBar.style.width = `100%`;
    stepIndicator.textContent = `Step ${totalSteps} of ${totalSteps}`;
  } else {
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    stepIndicator.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
  }
}

// Show or hide Medicaid number field based on selection
function toggleMedicaidField() {
  const medicaid = document.getElementById('medicaid').value;
  const medicaidContainer = document.getElementById('medicaidNumberContainer');
  medicaidContainer.style.display = (medicaid === 'yes') ? 'block' : 'none';
}

function restartForm() {
  // Reset form fields
  document.getElementById('leadForm').reset();

  // Hide thank-you step
  steps[currentStep].classList.remove('active');

  // Go back to the first step
  currentStep = 0;
  steps[currentStep].classList.add('active');

  // Reset progress bar
  updateProgressBar();
}

// Handle form submission
document.getElementById('leadForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitButton = this.querySelector('button[type="submit"]');
  if (submitButton.disabled) return; // Prevent multiple submissions

  submitButton.disabled = true;     // Disable the button
  submitButton.textContent = "Submitting..."; // Optional: show loading state

  const formData = new FormData(this);
  const data = Object.fromEntries(formData);

  try {
    // Send data to backend (Google Apps Script or Netlify function)
    const response = await fetch('/.netlify/functions/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error('Server error:', response.statusText);
      submitButton.disabled = false; // Re-enable button if error occurs
      submitButton.textContent = "Submit";
      return;
    } else {
      console.log('Form submitted successfully!');
    }

    // Show thank-you step and complete the progress
    steps[currentStep].classList.remove('active');
    currentStep = totalSteps; // Force to last step
    steps[currentStep].classList.add('active');
    updateProgressBar(); // This will now set progress to 100%

  } catch (err) {
    console.error('Error submitting form:', err);
    submitButton.disabled = false;  // Re-enable button if error occurs
    submitButton.textContent = "Submit";
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('Service Worker Failed:', err));
}
