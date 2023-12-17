const form = document.getElementById('obituary-form');
const previewElement = document.getElementById('preview-content');
const textSizeSlider = document.getElementById('text-size');

const nickNameField = document.getElementById('nick-name');
const nickNameLabel = document.querySelector("label[for='nick-name']");

const toggle = document.getElementById('show-nick-name');

function updateNicknameVisibility() {
  if(toggle.checked) {
    nickNameField.style.display = 'block';
    nickNameLabel.style.display = 'block';
  } else {
    nickNameField.style.display = 'none';
    nickNameLabel.style.display = 'none';
  }
}

// Initial call
updateNicknameVisibility();

toggle.addEventListener('change', updateNicknameVisibility);

const namePreviewTemplate = `
    <span id="first-name"></span>
    <span id="nick-name"></span>
    <span id="last-name"></span>
    <span style="font-size: 0.5em">ז"ל</span>
`;

function updatePreview() {
  try {
    // Get divs
    const formFields = form.querySelectorAll('.form-field');

    // Build values object
    const values = {};
    formFields.forEach(field => {
      const input = field.querySelector('input, textarea');  
      values[input.id] = input.value;
    });

    // Update name preview dynamically
    const namePreviewElement = document.createElement('name-preview');
    namePreviewElement.innerHTML = namePreviewTemplate;

    const firstNameElement = namePreviewElement.querySelector('#first-name');
    firstNameElement.textContent = values['first-name'];

    const showNickName = document.getElementById('show-nick-name').checked;
    const nickNameElement = namePreviewElement.querySelector('#nick-name');
    nickNameElement.textContent = showNickName ? values['nick-name'] : '';

    const lastNameElement = namePreviewElement.querySelector('#last-name');
    lastNameElement.textContent = values['last-name'];

    // Update font size based on slider
    const fontSize = `${textSizeSlider.value}px`;
    namePreviewElement.style.fontSize = fontSize;

    // Update obituary text with formatted date and day of week
    const selectedDate = new Date(values['date-of-burial']);
    const formattedDate = selectedDate.toLocaleDateString('he-IL');
    const dayOfWeek = selectedDate.toLocaleDateString('he-IL', { weekday: 'long' });

    const obituaryText = `
      <div id="intro">
        בצער רב אנו מודיעים על פטירתו של <br><span class="relation">${values['relation']}</span>
      </div>

      ${namePreviewElement.outerHTML}

      הלוויה תתקיים ביום ${dayOfWeek}, ${formattedDate} בשעה ${values['hour-of-burial']}.
      <br>
      ${values['location-of-burial']}

      <div id="bottom">
      <span class="shiva"> ${values.shiva.replace(/\n/g, '<br>')}</span>
        <span class="grievers">${values['grievers']}</span>
      </div>
      </div>
    `;

    // Update preview text
    previewElement.innerHTML = obituaryText;
  } catch (error) {
    console.error('Error updating preview:', error);
  }
}

// Update preview on initial load and form changes
updatePreview();
form.addEventListener('input', updatePreview);
textSizeSlider.addEventListener('input', updatePreview);
