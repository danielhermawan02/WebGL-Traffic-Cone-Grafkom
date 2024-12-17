let cubeRotation = 0.0;

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
      modelViewMatrix: wgl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
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
  const positionBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ARRAY_BUFFER, positionBuffer);

  const baseRadius = 1.0;
  const height = 2.0;
  const segments = 32; // Number of segments for the circular base
  const positions = [];

  // Add the apex vertex
  positions.push(0.0, height, 0.0); // Apex at (0, height, 0)

  // Add vertices for the base
  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const x = baseRadius * Math.cos(angle);
    const z = baseRadius * Math.sin(angle);
    positions.push(x, 0.0, z); // Base vertices at (x, 0, z)
  }

  wgl.bufferData(
    wgl.ARRAY_BUFFER,
    new Float32Array(positions),
    wgl.STATIC_DRAW
  );

  // Define colors for the cone (alternating stripes for the sides)
  const colorBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ARRAY_BUFFER, colorBuffer);

  const colors = [];
  colors.push(1.0, 0.65, 0.0, 1.0); // Orange color for apex
  for (let i = 0; i <= segments; i++) {
    const isEven = i % 2 === 0;
    if (isEven) {
      colors.push(1.0, 0.65, 0.0, 1.0); // Orange
    } else {
      colors.push(1.0, 1.0, 1.0, 1.0); // White
    }
  }

  wgl.bufferData(
    wgl.ARRAY_BUFFER,
    new Float32Array(colors),
    wgl.STATIC_DRAW
  );

  // Define indices for the cone
  const indexBuffer = wgl.createBuffer();
  wgl.bindBuffer(wgl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  const indices = [];
  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1); // Triangles for the sides
  }

  wgl.bufferData(
    wgl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    wgl.STATIC_DRAW
  );

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
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
  mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, -1.0, -6.0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 1, 0]);

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

  {
    const vertexCount = 3 * 32; // 32 triangles
    const type = wgl.UNSIGNED_SHORT;
    const offset = 0;
    wgl.drawElements(wgl.TRIANGLES, vertexCount, type, offset);
  }

  cubeRotation += deltaTime;
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
