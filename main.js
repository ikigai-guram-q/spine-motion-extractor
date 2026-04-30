let jsonData = null;

const fileInput = document.getElementById("fileInput");
const animationSelect = document.getElementById("animationSelect");
const extractBtn = document.getElementById("extractBtn");
const output = document.getElementById("output");

// helper for rounding
function round(num) {
  return Number(num).toFixed(2);
}

// Load JSON
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    jsonData = JSON.parse(event.target.result);
    populateAnimations();
  };
  reader.readAsText(file);
});

// Fill animation dropdown
function populateAnimations() {
  animationSelect.innerHTML = "";

  const animations = jsonData.animations;
  for (let name in animations) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    animationSelect.appendChild(option);
  }
}

// Extract data
extractBtn.addEventListener("click", () => {
  if (!jsonData) return;

  const animName = animationSelect.value;
  const anim = jsonData.animations[animName];

  const rows = [];

  for (let boneName in anim.bones) {
    const bone = anim.bones[boneName];

    if (bone.translate) {
      processTimeline(bone.translate, "translate.y", rows);
    }

    if (bone.scale) {
      processTimeline(bone.scale, "scale", rows);
    }
  }

  renderTable(rows);
});

// Process timeline
function processTimeline(frames, label, rows) {
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];

    const time = a.time ?? 0;
    const duration = (b.time ?? 0) - time;

    let valueA = a.y ?? a.value ?? 0;
    let valueB = b.y ?? b.value ?? 0;

    let curve = a.curve;

    let bezier = "Linear";

    if (Array.isArray(curve)) {
      bezier = curve.map(n => round(n)).join(", ");
    }

    rows.push({
      time: round(time),
      value: `${round(valueA)} → ${round(valueB)}`,
      duration: round(duration),
      bezier: bezier
    });
  }
}

// Render HTML table
function renderTable(rows) {
  output.innerHTML = `
    <table class="resultTable">
      <thead>
        <tr>
          <th>Time</th>
          <th>Value From → To</th>
          <th>Duration</th>
          <th>Bezier</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.time}</td>
            <td>${r.value}</td>
            <td>${r.duration}</td>
            <td>${r.bezier}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
