let currentStep = 0;
const steps = document.querySelectorAll('.step');
const totalSteps = steps.length - 1; // Keep this line (thank-you is excluded)

// Initialize progress bar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateProgressBar();
});

// Move to the next step
function nextStep() {
  if (currentStep < totalSteps) {
    steps[currentStep].classList.remove('active');
    currentStep++;
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

// Handle form submission
document.getElementById('leadForm').addEventListener('submit', async function(e) {
  e.preventDefault();
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
    } else {
      console.log('Form submitted successfully!');
    }
  } catch (err) {
    console.error('Error submitting form:', err);
  }

  // Show thank-you step and complete the progress
  steps[currentStep].classList.remove('active');
  currentStep = totalSteps; // Force to last step
  steps[currentStep].classList.add('active');
  updateProgressBar(); // This will now set progress to 100%
});

// Typing animation for quote
const quoteText = "Keeping You Home, Keeping You Safe !";
let quoteIndex = 0;
let isDeleting = false;

function typeQuote() {
  const typingElement = document.getElementById('typingQuote');

  if (!isDeleting) {
    typingElement.textContent = quoteText.substring(0, quoteIndex + 1);
    quoteIndex++;
    if (quoteIndex === quoteText.length) {
      isDeleting = true;
      setTimeout(typeQuote, 1500); // Pause before deleting
      return;
    }
  } else {
    typingElement.textContent = quoteText.substring(0, quoteIndex - 1);
    quoteIndex--;
    if (quoteIndex === 0) {
      isDeleting = false;
    }
  }
  setTimeout(typeQuote, isDeleting ? 50 : 100); // Typing speed
}

document.addEventListener('DOMContentLoaded', typeQuote);
