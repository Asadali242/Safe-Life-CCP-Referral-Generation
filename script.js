let currentStep = 0;
const steps = document.querySelectorAll('.step');
const totalSteps = steps.length - 1; // Thank-you step excluded

// Initialize progress bar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateProgressBar();

  // Re-attach conditional field logic on load
  document.getElementById('know_birthdate').addEventListener('change', toggleBirthOrAgeField);
  document.getElementById('provide_address').addEventListener('change', toggleAddressOrCounty);
  toggleAddressOrCounty();
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
    } else if (knowBirthdate === 'no') {
      const ageField = document.getElementById('age');
      const ageError = document.getElementById('ageError');
      ageError.style.display = "none";
  
      if (!ageField.value.trim()) {
        ageError.textContent = "Please enter the client's age.";
        ageError.style.display = "block";
        return;
      } else if (isNaN(ageField.value.trim()) || ageField.value.trim() <= 0 || ageField.value.trim() > 120) {
        ageError.textContent = "Enter a valid age (1–120).";
        ageError.style.display = "block";
        return;
      }
    }
  
    nextStep();
    return;
  }
  
  // Step 3: Medicaid
  if (stepIndex === 3) {
    const medicaidDropdown = document.getElementById('medicaid');
    const medicaidError    = document.getElementById('medicaidError');
    medicaidError.style.display = "none";

    if (!medicaidDropdown.value) {
      medicaidError.textContent = "Please select Yes or No.";
      medicaidError.style.display = "block";
      return;
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
    const provide      = document.getElementById('provide_address').value;
    const provideError = document.getElementById('provideAddressError');
    provideError.style.display = 'none';

    if (!provide) {
      provideError.textContent = "Please select Yes or No.";
      provideError.style.display = 'block';
      return;
    }

    let valid = true;

    if (provide === 'yes') {
      // Validate full address
      const line1        = document.getElementById('address_line1');
      const line1Err     = document.getElementById('addressLine1Error');
      const cityYes      = document.getElementById('city_yes');
      const cityYesErr   = document.getElementById('cityYesError');
      const stateField   = document.getElementById('state');
      const stateErr     = document.getElementById('stateError');
      const zipYes       = document.getElementById('zip_yes');
      const zipYesErr    = document.getElementById('zipYesError');

      // Reset errors
      [line1Err, cityYesErr, stateErr, zipYesErr].forEach(e => e.style.display = 'none');

      if (!line1.value.trim()) {
        line1Err.textContent = "Address Line 1 is required.";
        line1Err.style.display = 'block';
        valid = false;
      }

      if (!/^[A-Za-z ]+$/.test(cityYes.value.trim())) {
        cityYesErr.textContent = "City can only contain letters and spaces.";
        cityYesErr.style.display = 'block';
        valid = false;
      }

      const st = stateField.value.trim().toUpperCase();
      stateField.value = st;
      if (!/^[A-Z]{2}$/.test(st)) {
        stateErr.textContent = "State must be exactly 2 letters.";
        stateErr.style.display = 'block';
        valid = false;
      }

      if (!/^\d{5}$/.test(zipYes.value.trim())) {
        zipYesErr.textContent = "Enter a valid 5-digit Zip Code.";
        zipYesErr.style.display = 'block';
        valid = false;
      }

      if (!valid) return;
    }

    if (provide === 'no') {
      // Validate city_no, zip_no
      const cityNo    = document.getElementById('city_no');
      const cityNoErr = document.getElementById('cityNoError');
      const zipNo     = document.getElementById('zip_no');
      const zipNoErr  = document.getElementById('zipNoError');

      [cityNoErr, zipNoErr].forEach(e => e.style.display = 'none');

      if (!/^[A-Za-z ]+$/.test(cityNo.value.trim())) {
        cityNoErr.textContent = "City can only contain letters and spaces.";
        cityNoErr.style.display = 'block';
        valid = false;
      }
      if (!/^\d{5}$/.test(zipNo.value.trim())) {
        zipNoErr.textContent = "Enter a valid 5-digit Zip Code.";
        zipNoErr.style.display = 'block';
        valid = false;
      }

      if (!valid) return;
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

function toggleBirthOrAgeField() {
  const know = document.getElementById('know_birthdate').value;
  document.getElementById('birthdateContainer').style.display = (know === 'yes') ? 'block' : 'none';
  document.getElementById('ageContainer')     .style.display = (know === 'no')  ? 'block' : 'none';
}

function toggleMedicaidField() {
  const medicaid = document.getElementById('medicaid').value;
  const medicaidContainer = document.getElementById('medicaidNumberContainer');
  medicaidContainer.style.display = (medicaid === 'yes') ? 'block' : 'none';
}

function toggleAddressOrCounty() {
  const provide = document.getElementById('provide_address').value;

  const yesGroup = document.querySelectorAll('#addressFields input');
  const noGroup  = document.querySelectorAll('#countyCityZipContainer input');

  if (provide === 'yes') {
    // show full address, hide minimal
    document.getElementById('addressFields').style.display = 'block';
    document.getElementById('countyCityZipContainer').style.display = 'none';

    // enable the Yes-fields, disable the No-fields
    yesGroup.forEach(i => i.disabled = false);
    noGroup .forEach(i => i.disabled = true);

  } else if (provide === 'no') {
    // show minimal, hide full
    document.getElementById('addressFields').style.display = 'none';
    document.getElementById('countyCityZipContainer').style.display = 'block';

    // disable the Yes-fields, enable the No-fields
    yesGroup.forEach(i => i.disabled = true);
    noGroup .forEach(i => i.disabled = false);

  } else {
    // nothing selected yet
    document.getElementById('addressFields').style.display = 'none';
    document.getElementById('countyCityZipContainer').style.display = 'none';
    yesGroup.forEach(i => i.disabled = true);
    noGroup .forEach(i => i.disabled = true);
  }
}

function restartForm() {
  const form = document.getElementById('leadForm');

  // 1) Reset all form controls (inputs, selects, textareas)
  form.reset();

  // 2) Hide every conditional section
  document.getElementById('birthdateContainer').style.display      = 'none';
  document.getElementById('ageContainer').style.display            = 'none';
  document.getElementById('medicaidNumberContainer').style.display = 'none';
  document.getElementById('addressFields').style.display           = 'none';
  document.getElementById('countyCityZipContainer').style.display    = 'none';

  // 3) Clear all error text and hide them
  document.querySelectorAll('.error-message, .error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });

  // 4) Reset the submit button
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit';
  }

  // 5) Hide _all_ steps, then show step 0
  steps.forEach(s => s.classList.remove('active'));
  currentStep = 0;
  steps[0].classList.add('active');

  // 6) Reset and redraw the progress bar
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
