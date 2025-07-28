let currentStep = 0;
const steps = document.querySelectorAll('.step');
const totalSteps = steps.length - 1; // Thank-you step excluded

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
    nextStep();
    return;
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
    nextStep();
    return;
  }

  // Step 2: Birth Date
  if (stepIndex === 2) {
    const knowBirthdate = document.getElementById('know_birthdate').value;
    const knowBirthdateError = document.getElementById('knowBirthdateError');
    knowBirthdateError.style.display = "none";

    if (!knowBirthdate) {
      knowBirthdateError.textContent = "Please select Yes or No.";
      knowBirthdateError.style.display = "block";
      return;
    }

    // If "Yes", validate birthdate format
    if (knowBirthdate === 'yes') {
      const birthdateField = document.getElementById('birthdate');
      const birthdateError = document.getElementById('birthdateError');
      birthdateError.style.display = "none";

      const value = birthdateField.value.trim();
      const birthdatePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/;

      if (!value) {
        birthdateError.textContent = "Please enter the birthdate.";
        birthdateError.style.display = "block";
        return;
      } else if (!birthdatePattern.test(value)) {
        birthdateError.textContent = "Enter a valid date in mm/dd/yyyy format.";
        birthdateError.style.display = "block";
        return;
      }
    }
    nextStep();
    return;
  }

  // Step 3: Medicaid
  if (stepIndex === 3) {
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
    nextStep();
    return;
  }

  // Step 4: Phone/Email
  if (stepIndex === 4) {
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
    nextStep();
    return;
  }

  // Step 5: Address Question + Fields
  if (stepIndex === 5) {
    const provideAddress = document.getElementById('provide_address').value;
    const provideAddressError = document.getElementById('provideAddressError');
    provideAddressError.style.display = "none";

    // Must choose Yes or No
    if (!provideAddress) {
      provideAddressError.textContent = "Please select Yes or No.";
      provideAddressError.style.display = "block";
      return;
    }

    // If "Yes", validate all address fields
    if (provideAddress === 'yes') {
      const line1 = document.getElementById('address_line1');
      const city = document.getElementById('city');
      const state = document.getElementById('state');
      const zip = document.getElementById('zip');

      const line1Error = document.getElementById('addressLine1Error');
      const cityError = document.getElementById('cityError');
      const stateError = document.getElementById('stateError');
      const zipError = document.getElementById('zipError');

      let valid = true;

      // Reset errors
      line1Error.style.display = "none";
      cityError.style.display = "none";
      stateError.style.display = "none";
      zipError.style.display = "none";

      // Validate Address Line 1
      if (!line1.value.trim()) {
        line1Error.textContent = "Address Line 1 is required.";
        line1Error.style.display = "block";
        valid = false;
      }

      // Validate City (letters and spaces only)
      const cityPattern = /^[A-Za-z ]+$/;
      if (!city.value.trim()) {
        cityError.textContent = "City is required.";
        cityError.style.display = "block";
        valid = false;
      } else if (!cityPattern.test(city.value.trim())) {
        cityError.textContent = "City can only contain letters and spaces.";
        cityError.style.display = "block";
        valid = false;
      }

      // Validate State (2 uppercase letters)
      const statePattern = /^[A-Z]{2}$/;
      const stateValue = state.value.trim().toUpperCase(); // Convert to uppercase
      state.value = stateValue; // Update input to uppercase automatically

      if (!stateValue) {
        stateError.textContent = "State is required.";
        stateError.style.display = "block";
        valid = false;
      } else if (!statePattern.test(stateValue)) {
        stateError.textContent = "State must be exactly 2 letters (e.g., IL).";
        stateError.style.display = "block";
        valid = false;
      }

      // Validate Zip (must be 5 digits)
      const zipPattern = /^[0-9]{5}$/;
      if (!zip.value.trim()) {
        zipError.textContent = "Zip Code is required.";
        zipError.style.display = "block";
        valid = false;
      } else if (!zipPattern.test(zip.value.trim())) {
        zipError.textContent = "Enter a valid 5-digit Zip Code.";
        zipError.style.display = "block";
        valid = false;
      }

      if (!valid) return; // Stop if validation fails
    }
    nextStep();
    return;
  }

  // Step 6: Additional Info (No validation needed)
  if (stepIndex === 6) {
    nextStep();
    return;
  }
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
    progressBar.style.width = `100%`;
    stepIndicator.textContent = `Step ${totalSteps} of ${totalSteps}`;
  } else {
    const progress = (currentStep / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    stepIndicator.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
  }
}

function toggleBirthDateField() {
  const knowBirthdate = document.getElementById('know_birthdate').value;
  const birthdateContainer = document.getElementById('birthdateContainer');
  birthdateContainer.style.display = (knowBirthdate === 'yes') ? 'block' : 'none';
}

function toggleMedicaidField() {
  const medicaid = document.getElementById('medicaid').value;
  const medicaidContainer = document.getElementById('medicaidNumberContainer');
  medicaidContainer.style.display = (medicaid === 'yes') ? 'block' : 'none';
}

function toggleAddressFields() {
  const provideAddress = document.getElementById('provide_address').value;
  const addressFields = document.getElementById('addressFields');
  addressFields.style.display = (provideAddress === 'yes') ? 'block' : 'none';
}

function restartForm() {
  document.getElementById('leadForm').reset();
  steps[currentStep].classList.remove('active');
  currentStep = 0;
  steps[currentStep].classList.add('active');
  updateProgressBar();
}

// Handle form submission
document.getElementById('leadForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const submitButton = this.querySelector('button[type="submit"]');
  if (submitButton.disabled) return;

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const formData = new FormData(this);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('/.netlify/functions/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error('Server error:', response.statusText);
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
      return;
    }

    steps[currentStep].classList.remove('active');
    currentStep = totalSteps;
    steps[currentStep].classList.add('active');
    updateProgressBar();
  } catch (err) {
    console.error('Error submitting form:', err);
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('Service Worker Registered'))
    .catch(err => console.error('Service Worker Failed:', err));
}
