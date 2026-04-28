let spineData = null;

const fileInput = document.getElementById("fileInput");
const animationSelect = document.getElementById("animationSelect");
const boneSelect = document.getElementById("boneSelect");
const propertySelect = document.getElementById("propertySelect");
const output = document.getElementById("output");
const extractBtn = document.getElementById("extractBtn");

const canvas = document.getElementById("curveCanvas");
const ctx = canvas.getContext("2d");

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
      clearCanvas();
      populateAnimations();
    } catch (err) {
      output.textContent = "Error reading JSON:\n" + err.message;
      clearCanvas();
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
      clearCanvas();
      return;
    }

    const animName = animationSelect.value;
    const boneName = boneSelect.value;
    const property = propertySelect.value;

    const anim = spineData.animations[animName];
    const bone = anim.bones[boneName];

    if (!bone) {
      output.textContent = "Selected bone not found.";
      clearCanvas();
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
      clearCanvas();
      return;
    }

    if (timeline.length < 2) {
      output.textContent = "Timeline has only one keyframe. No segment to extract.";
      clearCanvas();
      return;
    }

    let rows = [];
    let graphPoints = [];

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

      const bezierArray = getFourNumberBezierArray(current.curve, property);
      const bezierText = formatBezier(bezierArray, current.curve);

      rows.push(
        `${startTime.toFixed(3)}s | ${fromValue} → ${toValue} | ${duration.toFixed(3)}s | ${bezierText}`
      );

      const samples = 40;

      for (let s = 0; s <= samples; s++) {
        const localT = s / samples;
        let easedT = localT;

        if (current.curve === "stepped") {
          easedT = 0;
        } else if (bezierArray) {
          easedT = cubicBezierEase(localT, bezierArray[0], bezierArray[1], bezierArray[2], bezierArray[3]);
        }

        const time = startTime + duration * localT;
        const value = fromValue + (toValue - fromValue) * easedT;

        graphPoints.push({ time, value });
      }
    }

    output.textContent = rows.join("\n");
    drawGraph(graphPoints);

  } catch (err) {
    output.textContent = "Extraction error:\n" + err.message;
    console.error(err);
    clearCanvas();
  }
}

function getFourNumberBezierArray(curve, property) {
  if (!curve) return null;
  if (curve === "stepped") return null;
  if (!Array.isArray(curve)) return null;

  if (curve.length === 4) {
    return curve;
  }

  if (curve.length >= 8) {
    if (property.endsWith(".x")) {
      return curve.slice(0, 4);
    }

    if (property.endsWith(".y")) {
      return curve.slice(4, 8);
    }

    return curve.slice(0, 4);
  }

  return null;
}

function formatBezier(bezierArray, originalCurve) {
  if (!originalCurve) return "linear";
  if (originalCurve === "stepped") return "stepped";

  if (!bezierArray) return String(originalCurve);

  return bezierArray.map(v => Number(v).toFixed(3)).join(", ");
}

function cubicBezierEase(progress, x1, y1, x2, y2) {
  let low = 0;
  let high = 1;
  let t = progress;

  for (let i = 0; i < 20; i++) {
    t = (low + high) / 2;
    const x = cubicBezierValue(t, x1, x2);

    if (x < progress) {
      low = t;
    } else {
      high = t;
    }
  }

  return cubicBezierValue(t, y1, y2);
}

function cubicBezierValue(t, p1, p2) {
  const u = 1 - t;

  return (
    3 * u * u * t * p1 +
    3 * u * t * t * p2 +
    t * t * t
  );
}

function drawGraph(points) {
  clearCanvas();

  if (!points || points.length === 0) return;

  const padding = 45;
  const width = canvas.width;
  const height = canvas.height;

  const minTime = Math.min(...points.map(p => p.time));
  const maxTime = Math.max(...points.map(p => p.time));
  const minValue = Math.min(...points.map(p => p.value));
  const maxValue = Math.max(...points.map(p => p.value));

  const timeRange = maxTime - minTime || 1;
  const valueRange = maxValue - minValue || 1;

  function mapX(time) {
    return padding + ((time - minTime) / timeRange) * (width - padding * 2);
  }

  function mapY(value) {
    return height - padding - ((value - minValue) / valueRange) * (height - padding * 2);
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.strokeStyle = "#6ee7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((p, index) => {
    const x = mapX(p.time);
    const y = mapY(p.value);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Arial";
  ctx.fillText(`time: ${minTime.toFixed(3)}s → ${maxTime.toFixed(3)}s`, padding, 20);
  ctx.fillText(`value: ${minValue.toFixed(3)} → ${maxValue.toFixed(3)}`, padding, 36);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
