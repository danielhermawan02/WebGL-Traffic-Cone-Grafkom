let cylinderRotation = 0.0;

main();

function main() {
  const canvasEl = document.querySelector("#model-container");
  const wgl =
    canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

  if (!wgl) {
    alert("Try to enable WebGL in Chrome.");
    return;
  }

  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

  const shaderProgram = initShaderProgram(wgl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: wgl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: wgl.getAttribLocation(shaderProgram, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: wgl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: wgl.getUniformLocation(
        shaderProgram,
        "uModelViewMatrix"
      ),
    },
  };

  const buffers = initBuffers(wgl);

  let then = 0;

  function render(now) {
    now *= 0.001;
    const deltaTime = now - then;
    then = now;

    drawScene(wgl, programInfo, buffers, deltaTime);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function initBuffers(wgl) {
  const positions = [];
  const colors = [];
  const indices = [];

  const baseSize = 1.5;
  const baseHeight = 0.5;
  const cylinderHeight = 2.5;
  const cylinderRadius = 0.5;
  const segments = 32;

  // Rectangle base vertices
  positions.push(
    -baseSize, 0, -baseSize,
    baseSize, 0, -baseSize,
    baseSize, 0, baseSize,
    -baseSize, 0, baseSize,

    -baseSize, -baseHeight, -baseSize,
    baseSize, -baseHeight, -baseSize,
    baseSize, -baseHeight, baseSize,
    -baseSize, -baseHeight, baseSize
  );

  // Rectangle base colors (white)
  for (let i = 0; i < 8; i++) {
    colors.push(1.0, 1.0, 1.0, 1.0); // White
  }

  // Rectangle base indices
  indices.push(
    0, 1, 2, 0, 2, 3, // Top face
    4, 5, 6, 4, 6, 7, // Bottom face
    0, 1, 5, 0, 5, 4, // Sides
    1, 2, 6, 1, 6, 5,
    2, 3, 7, 2, 7, 6,
    3, 0, 4, 3, 4, 7
  );

  // Cylinder vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = Math.cos(angle) * cylinderRadius;
    const z = Math.sin(angle) * cylinderRadius;

    // Top circle
    positions.push(x, baseHeight + cylinderHeight, z);
    colors.push(1.0, 0.5, 0.0, 1.0); // Orange

    // Bottom circle
    positions.push(x, baseHeight, z);
    colors.push(1.0, 0.5, 0.0, 1.0); // Orange
  }

  // Cylinder indices
  for (let i = 0; i < segments; i++) {
    const topStart = 8 + i * 2;
    const bottomStart = topStart + 1;
    const nextTop = topStart + 2;
    const nextBottom = bottomStart + 2;

    // Side triangles
    indices.push(topStart, bottomStart, nextBottom);
    indices.push(topStart, nextBottom, nextTop);
  }

  // Top and bottom circle faces
  const topCenter = positions.length / 3;
  positions.push(0, baseHeight + cylinderHeight, 0);
  colors.push(1.0, 0.5, 0.0, 1.0);

  const bottomCenter = positions.length / 3;
  positions.push(0, baseHeight, 0);
  colors.push(1.0, 0.5, 0.0, 1.0);

  for (let i = 0; i < segments; i++) {
    const topStart = 8 + i * 2;
    const bottomStart = topStart + 1;

    // Top circle
    indices.push(topStart, topStart + 2, topCenter);

    // Bottom circle
    indices.push(bottomStart, bottomCenter, bottomStart + 2);
  }

  const positionBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ARRAY_BUFFER, positionBuffer);
  wgl.bufferData(wgl.ARRAY_BUFFER, new Float32Array(positions), wgl.STATIC_DRAW);

  const colorBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ARRAY_BUFFER, colorBuffer);
  wgl.bufferData(wgl.ARRAY_BUFFER, new Float32Array(colors), wgl.STATIC_DRAW);

  const indexBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  wgl.bufferData(
    wgl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    wgl.STATIC_DRAW
  );

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
    vertexCount: indices.length,
  };
}

function drawScene(wgl, programInfo, buffers, deltaTime) {
  wgl.clearColor(0.2, 0.35, 0.15, 1.0);
  wgl.clearDepth(1.0);
  wgl.enable(wgl.DEPTH_TEST);
  wgl.depthFunc(wgl.LEQUAL);

  wgl.clear(wgl.COLOR_BUFFER_BIT | wgl.DEPTH_BUFFER_BIT);

  const fieldOfView = (45 * Math.PI) / 180;
  const aspect = wgl.canvas.clientWidth / wgl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [0, -1, -10]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cylinderRotation, [0, 1, 0]);

  {
    const numComponents = 3;
    const type = wgl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    wgl.bindBuffer(wgl.ARRAY_BUFFER, buffers.position);
    wgl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    wgl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  {
    const numComponents = 4;
    const type = wgl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    wgl.bindBuffer(wgl.ARRAY_BUFFER, buffers.color);
    wgl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    wgl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
  }

  wgl.bindBuffer(wgl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  wgl.useProgram(programInfo.program);

  wgl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );

  wgl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  wgl.drawElements(wgl.TRIANGLES, buffers.vertexCount, wgl.UNSIGNED_SHORT, 0);

  cylinderRotation += deltaTime;
}

function initShaderProgram(wgl, vsSource, fsSource) {
  const vertexShader = loadShader(wgl, wgl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(wgl, wgl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = wgl.createProgram();

  wgl.attachShader(shaderProgram, vertexShader);
  wgl.attachShader(shaderProgram, fragmentShader);
  wgl.linkProgram(shaderProgram);

  if (!wgl.getProgramParameter(shaderProgram, wgl.LINK_STATUS)) {
    alert(
      "Unable to initialize the shader program: " +
        wgl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }

  return shaderProgram;
}

function loadShader(wgl, type, source) {
  const shader = wgl.createShader(type);

  wgl.shaderSource(shader, source);

  wgl.compileShader(shader);

  if (!wgl.getShaderParameter(shader, wgl.COMPILE_STATUS)) {
    alert(
      "An error occurred compiling the shaders: " + wgl.getShaderInfoLog(shader)
    );

    wgl.deleteShader(shader);

    return null;
  }

  return shader;
}
