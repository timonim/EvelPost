const form = document.getElementById('obituary-form');
const previewElement = document.getElementById('preview-content');
const textSizeSlider = document.getElementById('text-size');

const nickNameField = document.getElementById('nick-name');
const nickNameLabel = document.querySelector("label[for='nick-name']");

const toggle = document.getElementById('show-nick-name');

function updateNicknameVisibility() {
  if (toggle.checked) {
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

// Name preview template
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
    nickNameElement.textContent = showNickName ? `(${values['nick-name']})` : '';

    const lastNameElement = namePreviewElement.querySelector('#last-name');
    lastNameElement.textContent = values['last-name'];

    const minFontSize = 0.5; // minimum font size in em
    const maxFontSize = 30; // maximum font size in em
    
    // Update font size based on slider
    const fontSize = `clamp(${minFontSize}em, ${textSizeSlider.value}vw, ${maxFontSize}em)`;
    namePreviewElement.style.fontSize = fontSize;

    // Update obituary text with formatted date and day of week
    const selectedDateInput = values['date-of-burial'];
    let formattedDate = '';
    let hebrewFormattedDate = '';
    let dayOfWeek = '';

    if (selectedDateInput) {
      const selectedDate = new Date(selectedDateInput);

      if (!isNaN(selectedDate.getTime())) {
        // The selected date is valid
        formattedDate = selectedDate.toLocaleDateString('he-IL');
        hebrewFormattedDate = getHebrewFormattedDate(selectedDate); // Add function to get Hebrew formatted date
        dayOfWeek = selectedDate.toLocaleDateString('he-IL', { weekday: 'long' });
      } else {
        // The selected date is invalid
        console.error('Invalid date selected');
      }
    } else {
      // No date chosen yet
      console.log('No date chosen yet');
    }

    // Function to get Hebrew formatted date
    function getHebrewFormattedDate(date) {
      const hebrewDate = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);

      return hebrewDate;
    }

    // Update preview with Hebrew formatted date
    const showHebrewDate = document.getElementById('show-hebrew-date').checked;

    // Obituary text
    const obituaryText = `
      <div id="intro">
        אנו נפרדים בצער וכאב <br><span class="relation">${values['relation']}</span>
      </div>

      ${namePreviewElement.outerHTML}

      הלוויה תתקיים ב${dayOfWeek}, ${formattedDate} ${showHebrewDate ? `(${hebrewFormattedDate})` : ''} בשעה ${values['hour-of-burial']}.
      <br>
      ${values['location-of-burial']}

      <div id="bottom">
      <span id="shiva"> ${values.shiva.replace(/\n/g, '<br>')}</span>
        <span id="grievers">${values['grievers']}</span>
      </div>
    </div>`;

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

async function exportToPDF() {
  try {
    // Open a new tab
    const newTab = window.open('', '_blank');

    // Generate the HTML content for printing
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wdth,wght@62.5..100,100..900&display=swap" rel="stylesheet">
          <title>Obituary Preview</title>
          <link rel="stylesheet" href="styles.css">
          <style>

              @page {
                size: 29.7cm 21cm;
                margin: 0;
                size: a4 landscape;
              }

              header,
              footer {
                display: none:
              }

            body {
              margin: 0;
              // padding: 4% 2% 2% 2%;
              background-color: white;
              width: 29.7cm;
              height: 21cm;
            }

            #preview-content {
              margin: 4%; /* Center the content horizontally */
              background-color: white;
              aspect-ratio: 297 / 210;
              // zoom: 1.8;
              font-size: 2.8vw;
              border: 0.8em solid #000000;


              -webkit-text-size-adjust: none;
              -moz-transform: scale(1.8);
              -moz-transform-origin: 0 0;
              overflow: hidden;
            }

            name-preview {
              transform: scale(2.1);
            }

          </style>
        </head>
        <body>
          <div id="preview-content">
            ${previewElement.innerHTML}
          </div>
        </body>
      </html>
    `;

    // Write the HTML content to the new tab
    newTab.document.open();
    newTab.document.write(htmlContent);
    newTab.document.close();

    // Wait for the new tab to finish loading
    await new Promise((resolve) => {
      newTab.onload = resolve;
    });

    // Print the new tab
    newTab.print();

    // Close the new tab after printing
    if (navigator.userAgent.includes("Android")) {
      window.close();
    } else {
      newTab.close();
    }
  } catch (error) {
    console.error('An error occurred while exporting to PDF:', error);
  }
}