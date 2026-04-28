let spineData = null;

const fileInput = document.getElementById("fileInput");
const animationSelect = document.getElementById("animationSelect");
const boneSelect = document.getElementById("boneSelect");
const propertySelect = document.getElementById("propertySelect");
const output = document.getElementById("output");
const extractBtn = document.getElementById("extractBtn");

fileInput.addEventListener("change", handleFile);
animationSelect.addEventListener("change", populateBones);
extractBtn.addEventListener("click", extract);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(evt) {
    try {
      spineData = JSON.parse(evt.target.result);
      output.textContent = "JSON loaded successfully.";
      populateAnimations();
    } catch (err) {
      output.textContent = "Error reading JSON:\n" + err.message;
    }
  };

  reader.readAsText(file);
}

function populateAnimations() {
  animationSelect.innerHTML = "";

  if (!spineData.animations) {
    output.textContent = "No animations found in this JSON.";
    return;
  }

  Object.keys(spineData.animations).forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    animationSelect.appendChild(option);
  });

  populateBones();
}

function populateBones() {
  boneSelect.innerHTML = "";

  const animName = animationSelect.value;
  const anim = spineData.animations[animName];

  if (!anim || !anim.bones) {
    output.textContent = "No bone timelines found in this animation.";
    return;
  }

  Object.keys(anim.bones).forEach(boneName => {
    const option = document.createElement("option");
    option.value = boneName;
    option.textContent = boneName;
    boneSelect.appendChild(option);
  });
}

function extract() {
  try {
    if (!spineData) {
      output.textContent = "Please load a Spine JSON first.";
      return;
    }

    const animName = animationSelect.value;
    const boneName = boneSelect.value;
    const property = propertySelect.value;

    const anim = spineData.animations[animName];
    const bone = anim.bones[boneName];

    if (!bone) {
      output.textContent = "Selected bone not found.";
      return;
    }

    let timeline;
    let valueKey;

    if (property === "translate.x") {
      timeline = bone.translate;
      valueKey = "x";
    }

    if (property === "translate.y") {
      timeline = bone.translate;
      valueKey = "y";
    }

    if (property === "scale.x") {
      timeline = bone.scale;
      valueKey = "x";
    }

    if (property === "scale.y") {
      timeline = bone.scale;
      valueKey = "y";
    }

    if (property === "rotate") {
      timeline = bone.rotate;
      valueKey = "angle";
    }

    if (!timeline || timeline.length === 0) {
      output.textContent =
        `No ${property} timeline found for bone "${boneName}" in animation "${animName}".`;
      return;
    }

    if (timeline.length < 2) {
      output.textContent = "Timeline has only one keyframe. No segment to extract.";
      return;
    }

    let rows = [];

    rows.push(`Animation: ${animName}`);
    rows.push(`Bone: ${boneName}`);
    rows.push(`Property: ${property}`);
    rows.push("");
    rows.push("Time | Value From → To | Duration | Cubic Bezier");
    rows.push("--------------------------------------------------");

    for (let i = 0; i < timeline.length - 1; i++) {
      const current = timeline[i];
      const next = timeline[i + 1];

      const startTime = current.time ?? 0;
      const endTime = next.time ?? 0;
      const duration = endTime - startTime;

      const fromValue = current[valueKey] ?? 0;
      const toValue = next[valueKey] ?? fromValue;

      const bezier = getFourNumberBezier(current.curve, property);

      rows.push(
        `${startTime.toFixed(3)}s | ${fromValue} → ${toValue} | ${duration.toFixed(3)}s | ${bezier}`
      );
    }

    output.textContent = rows.join("\n");

  } catch (err) {
    output.textContent = "Extraction error:\n" + err.message;
    console.error(err);
  }
}

function getFourNumberBezier(curve, property) {
  if (!curve) return "linear";

  if (curve === "stepped") return "stepped";

  if (!Array.isArray(curve)) return String(curve);

  if (curve.length === 4) {
    return curve.map(v => Number(v).toFixed(3)).join(", ");
  }

  if (curve.length >= 8) {
    let selected;

    if (property.endsWith(".x")) {
      selected = curve.slice(0, 4);
    } else if (property.endsWith(".y")) {
      selected = curve.slice(4, 8);
    } else {
      selected = curve.slice(0, 4);
    }

    return selected.map(v => Number(v).toFixed(3)).join(", ");
  }

  return curve.map(v => Number(v).toFixed(3)).join(", ");
}
