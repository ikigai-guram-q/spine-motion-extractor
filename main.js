let spineData = null;

const fileInput = document.getElementById("fileInput");
const animationSelect = document.getElementById("animationSelect");
const boneSelect = document.getElementById("boneSelect");
const propertySelect = document.getElementById("propertySelect");
const output = document.getElementById("output");
const extractBtn = document.getElementById("extractBtn");

fileInput.addEventListener("change", handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    spineData = JSON.parse(evt.target.result);
    populateAnimations();
  };
  reader.readAsText(file);
}

function populateAnimations() {
  animationSelect.innerHTML = "";

  const animations = spineData.animations;
  for (let name in animations) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    animationSelect.appendChild(option);
  }

  populateBones();
}

animationSelect.addEventListener("change", populateBones);

function populateBones() {
  boneSelect.innerHTML = "";

  const anim = spineData.animations[animationSelect.value];
  if (!anim.bones) return;

  for (let bone in anim.bones) {
    const option = document.createElement("option");
    option.value = bone;
    option.textContent = bone;
    boneSelect.appendChild(option);
  }
}

extractBtn.addEventListener("click", extract);

function extract() {
  const animName = animationSelect.value;
  const boneName = boneSelect.value;
  const property = propertySelect.value;

  const anim = spineData.animations[animName];
  const bone = anim.bones[boneName];

  let timeline;

  if (property.startsWith("translate")) {
    timeline = bone.translate;
  } else if (property.startsWith("scale")) {
    timeline = bone.scale;
  } else if (property === "rotate") {
    timeline = bone.rotate;
  }

  if (!timeline) {
    output.textContent = "No data for this property.";
    return;
  }

  let result = [];

  for (let i = 0; i < timeline.length - 1; i++) {
    const curr = timeline[i];
    const next = timeline[i + 1];

    const duration = next.time - curr.time;

    let valueFrom, valueTo;

    if (property.includes("x")) {
      valueFrom = curr.x ?? 0;
      valueTo = next.x ?? 0;
    } else if (property.includes("y")) {
      valueFrom = curr.y ?? 0;
      valueTo = next.y ?? 0;
    } else if (property === "rotate") {
      valueFrom = curr.angle ?? 0;
      valueTo = next.angle ?? 0;
    }

    const curve = curr.curve || "linear";

    let bezier = "linear";

    if (Array.isArray(curve)) {
      bezier = curve.join(", ");
    }

    result.push(
      `${curr.time.toFixed(3)}s | ${valueFrom} → ${valueTo} | ${duration.toFixed(3)}s | ${bezier}`
    );
  }

  output.textContent = result.join("\n");
}
