function initProgram() {
    //准备webGL的上下文：获取canvas的引用并保存在canvas变量里，并获取webGLRenderingContest并赋值给gl
    //gl会用来引用webGL上下文
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }
    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
    canvas.onmouseout = handleMouseOut;
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    //定义天空盒顶点着色器
    const sky_vsSource = `
    attribute vec4 aTextureCoord;   //纹理坐标

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置

    varying highp vec3 vTextureCoord;
    
    void main() {
      vec4 pos = uProjectionMatrix * uViewMatrix * aTextureCoord;  //点坐标位置
      gl_Position = pos.xyww; //使其深度始终是w/w = 1,欺骗深度检测使天空盒在深处
      vTextureCoord = aTextureCoord.xyz;
    }
  `;
    //定义天空盒片段着色器
    const sky_fsSource = `
    varying highp vec3 vTextureCoord;
    precision mediump float;
    uniform samplerCube uSampler;

    void main() {
      gl_FragColor=textureCube(uSampler, normalize(vTextureCoord));
    }
  `;
    //定义雾天天空盒顶点着色器
    const fog_sky_vsSource = `
    attribute vec4 aTextureCoord;   //纹理坐标

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置

    varying highp vec3 vTextureCoord;
    
    void main() {
      vec4 pos = uProjectionMatrix * uViewMatrix * aTextureCoord;  //点坐标位置
      gl_Position = pos.xyww; //使其深度始终是w/w = 1,欺骗深度检测使天空盒在深处
      vTextureCoord = aTextureCoord.xyz;
    }
  `;
    //定义雾天天空盒片段着色器
    const fog_sky_fsSource = `
    varying highp vec3 vTextureCoord;
    precision mediump float;
    uniform samplerCube uSampler;

    void main() {
        float n=0.3;
        vec4 grey;
        grey=vec4(n, n, n,1.0);
        vec4 color=textureCube(uSampler, normalize(vTextureCoord));
        
      gl_FragColor = mix(color,grey,0.5);
    }
  `;
    //定义纹理顶点着色器
    const Texture_vsSource = `
    attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aNormal; //法向量
    attribute vec2 aTextCoord; //纹理

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uReverseModelMatrix; //模型矩阵的逆转置

    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
        //法向量进行归一化
        v_Normal = normalize(vec3(uReverseModelMatrix * aNormal));
        //变化后的坐标 -> 世界坐标
        v_Position = uModelMatrix * aVertexPosition;
        v_TextCoord = aTextCoord;
    }
  `;
    //定义纹理片段着色器
    const Texture_fsSource = `
    precision mediump float;
    uniform sampler2D uSampler;
    uniform vec3 uLightColor; //光颜色强度
    uniform vec3 uLightDirection; //光线方向

    uniform vec3 uAmbientLight; // 环境光
    
    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;
    
    void main() {
        //纹理作为颜色传入
        vec4 v_Color=texture2D(uSampler,v_TextCoord);
        //视线方向并归一化

        vec3 lightDirection = normalize(uLightDirection);
        //计算cos入射角 当角度大于90 说明光照在背面 赋值为0
        float nDotLight = max(dot(lightDirection, v_Normal), 0.0);
        //计算漫反射光颜色
        vec3 diffuse = uLightColor * v_Color.rgb * nDotLight;
        // 环境反射光颜色
        vec3 ambient = uAmbientLight * v_Color.rgb;
        gl_FragColor = vec4(diffuse + ambient, v_Color.a);
    }
  `;
    //定义雾天纹理顶点着色器
    const fog_Texture_vsSource = `
    attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aNormal; //法向量
    attribute vec2 aTextCoord; //纹理

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uReverseModelMatrix; //模型矩阵的逆转置
    
    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;
    varying vec3 vposition;     //用于计算距离的position

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
        //法向量进行归一化
        v_Normal = normalize(vec3(uReverseModelMatrix * aNormal));
        //变化后的坐标 -> 世界坐标
        v_Position = uModelMatrix * aVertexPosition;
        v_TextCoord = aTextCoord;
        vposition = v_Position.xyz;
    }
  `;
    //定义雾天纹理片段着色器
    const fog_Texture_fsSource = `
    precision mediump float;
    uniform sampler2D uSampler;
    uniform vec3 uEyePosition;  //观察位置
    uniform vec3 uLightColor; //光颜色强度
    uniform vec3 uLightDirection; //光源方向
    uniform vec3 uAmbientLight; // 环境光
    uniform float uFogDenisty;  //雾的密度
    uniform samplerCube uCubeSampler;

    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;
    varying vec3 vposition;     //用于计算距离的position

    void main() {
        vec3 viewDirection = normalize(uEyePosition - vposition); //通过uEyePosition和vpositon算出视线
        vec3 TextureCoord = viewDirection;  //天空盒对应的纹理坐标数值上跟视线一样
        float n=0.3;
        vec4 grey;
        grey=vec4(n, n, n,1.0);
        vec4 fogcolor = textureCube(uCubeSampler, normalize(TextureCoord));  // 雾的颜色
        fogcolor = mix(fogcolor,grey,0.5);
        //纹理作为颜色传入
        vec4 v_Color=texture2D(uSampler,v_TextCoord);
        #define LOG2 1.442695
        float fogDistance = length(vposition);
        float fogAmount = 1.0 - exp2(-uFogDenisty * uFogDenisty * fogDistance * fogDistance * LOG2);
        fogAmount = clamp(fogAmount, 0.0, 1.0);
        fogAmount = max(0.4,fogAmount);
        vec4 color=mix(v_Color, fogcolor, fogAmount); 
        //光线方向并归一化
        vec3 lightDirection = normalize(uLightDirection);
        //计算cos入射角 当角度大于90 说明光照在背面 赋值为0
        float cosLight = max(dot(lightDirection, v_Normal), 0.0);
        //计算漫反射反射光颜色
        vec3 diffuse = normalize(uLightColor) * color.rgb * cosLight;
        // 环境反射光颜色
        vec3 ambient = uAmbientLight * color.rgb;
        gl_FragColor = vec4(diffuse + ambient, color.a);
    }
  `;
    //定义顶点着色器
    const vsSource = `
    attribute vec4 aVertexColor; //颜色属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aVertexNormal; //法向量

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uNormalMatrix; //模型矩阵的逆转置,用于变换法向量

    varying lowp vec4 vColor;        //颜色varying类变量，用于向片段着色器传递颜色属性
    varying lowp vec3 vNomral;
    varying lowp vec4 vPosition;
    
    void main() {
      gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
      vColor = aVertexColor;        //点的颜色
      //变化后的坐标 -> 世界坐标
      vPosition = uModelMatrix * aVertexPosition;
      vNomral = normalize(vec3(uNormalMatrix * aVertexNormal));
    }
  `;
    //定义片段着色器
    const fsSource = `
    precision mediump float;

    uniform vec3 uLightColor; //光颜色强度
    uniform vec3 uLightDirection; //光源位置
    uniform vec3 uAmbientLight; // 环境光

    varying lowp vec4 vColor;
    varying lowp vec3 vNomral;
    varying lowp vec4 vPosition;
    
    void main() {
      vec3 lightDirection = normalize(uLightDirection);
      //计算cos入射角.当角度大于90,说明光照在背面,赋值为0
      float cosLight = max(dot(lightDirection, vNomral), 0.0);
      //计算漫反射反射光颜色
      vec3 diffuse = normalize(uLightColor) * vColor.rgb * cosLight;
      // 环境反射光颜色
      vec3 ambient = uAmbientLight * vColor.rgb;
      gl_FragColor = vec4(diffuse + ambient, vColor.a);
    }
  `;
    //定义雾顶点着色器
    const fog_vsSource = `
    attribute vec4 aVertexColor; //颜色属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
    attribute vec4 aVertexNormal; //法向量
   
    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uNormalMatrix; //模型矩阵的逆转置,用于变换法向量

    varying lowp vec4 vColor;        //颜色varying类变量，用于向片段着色器传递颜色属性
    varying lowp vec3 vNomral;
    varying lowp vec4 vPosition;
    varying lowp vec3 vposition;     //用于计算距离的position

    void main() {
      gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
      vColor = aVertexColor;        //点的颜色
      //变化后的坐标 -> 世界坐标
      vPosition = uModelMatrix * aVertexPosition;
      vNomral = normalize(vec3(uNormalMatrix * aVertexNormal));
      vposition = vPosition.xyz;
    }
  `;
    //定义雾片段着色器
    const fog_fsSource = `
    precision mediump float;
    uniform vec3 uEyePosition;  //观察位置
    uniform vec3 uLightColor; //光颜色强度
    uniform vec3 uLightDirection; //光源方向
    uniform vec3 uAmbientLight; // 环境光
    uniform float uFogDenisty;  //雾的密度
    uniform samplerCube uSampler;

    varying lowp vec4 vColor;
    varying lowp vec3 vNomral;
    varying lowp vec4 vPosition;
    varying lowp vec3 vposition;

    void main() {
      vec3 viewDirection = normalize(uEyePosition - vposition); //通过uEyePosition和vpositon算出视线
      vec3 TextureCoord = viewDirection;  //天空盒对应的纹理坐标数值上跟视线一样
      float n=0.3;
      vec4 grey;
      grey=vec4(n, n, n,1.0);
      vec4 fogcolor = textureCube(uSampler, normalize(TextureCoord));  // 雾的颜色
      fogcolor = mix(fogcolor,grey,0.5);
      #define LOG2 1.442695
      float fogDistance = length(vposition);
      float fogAmount = 1.0 - exp2(-uFogDenisty * uFogDenisty * fogDistance * fogDistance * LOG2);
      fogAmount = clamp(fogAmount, 0.0, 1.0);
      fogAmount = max(0.4,fogAmount);
      vec4 color=mix(vColor, fogcolor, fogAmount); 

      vec3 lightDirection = normalize(uLightDirection);
      //计算cos入射角.当角度大于90,说明光照在背面,赋值为0
      float cosLight = max(dot(lightDirection, vNomral), 0.0);
      //计算漫反射反射光颜色
      vec3 diffuse = normalize(uLightColor) * color.rgb * cosLight;
      // 环境反射光颜色
      vec3 ambient = uAmbientLight * color.rgb;
      gl_FragColor = vec4(diffuse + ambient, color.a);
    }
  `;
    //初始化着色器程序
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const fog_shaderProgram = initShaderProgram(gl, fog_vsSource, fog_fsSource);
    const sky_shaderProgram = initShaderProgram(gl, sky_vsSource, sky_fsSource);
    const fogsky_shaderProgram = initShaderProgram(gl, fog_sky_vsSource, fog_sky_fsSource);
    const Texture_shaderProgram = initShaderProgram(gl, Texture_vsSource, Texture_fsSource);
    const fog_Texture_shaderProgram = initShaderProgram(gl, fog_Texture_vsSource, fog_Texture_fsSource);

    //收集着色器程序会用到的所有信息
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
            uLightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
            uLightDirection: gl.getUniformLocation(shaderProgram, 'uLightDirection'),
            uAmbientLight: gl.getUniformLocation(shaderProgram, 'uAmbientLight'),
        },
    };
    const fog_programInfo = {
        program: fog_shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(fog_shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(fog_shaderProgram, 'aVertexColor'),
            vertexNormal: gl.getAttribLocation(fog_shaderProgram, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(fog_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(fog_shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(fog_shaderProgram, 'uModelMatrix'),
            normalMatrix: gl.getUniformLocation(fog_shaderProgram, 'uNormalMatrix'),
            uEyePosition: gl.getUniformLocation(fog_shaderProgram, 'uEyePosition'),
            uLightColor: gl.getUniformLocation(fog_shaderProgram, 'uLightColor'),
            uLightDirection: gl.getUniformLocation(fog_shaderProgram, 'uLightDirection'),
            uAmbientLight: gl.getUniformLocation(fog_shaderProgram, 'uAmbientLight'),
            uFogDenisty: gl.getUniformLocation(fog_shaderProgram, 'uFogDenisty'),
            uSampler: gl.getUniformLocation(fog_shaderProgram, 'uSampler'),
        },
    };
    const sky_programInfo = {
        program: sky_shaderProgram,
        attribLocations: {
            textureCoord: gl.getAttribLocation(sky_shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(sky_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(sky_shaderProgram, 'uViewMatrix'),
            uSampler: gl.getUniformLocation(sky_shaderProgram, 'uSampler'),
        },
    };
    const fogsky_programInfo = {
        program: fogsky_shaderProgram,
        attribLocations: {
            textureCoord: gl.getAttribLocation(fogsky_shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(fogsky_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(fogsky_shaderProgram, 'uViewMatrix'),
            uSampler: gl.getUniformLocation(fogsky_shaderProgram, 'uSampler'),
        },
    };
    const Texture_programInfo = {
        program: Texture_shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(Texture_shaderProgram, 'aVertexPosition'),
            normal: gl.getAttribLocation(Texture_shaderProgram, 'aNormal'),
            TextCoord: gl.getAttribLocation(Texture_shaderProgram, 'aTextCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(Texture_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(Texture_shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(Texture_shaderProgram, 'uModelMatrix'),
            reverseModelMatrix: gl.getUniformLocation(Texture_shaderProgram, 'uReverseModelMatrix'),
            Sampler: gl.getUniformLocation(Texture_shaderProgram, 'uSampler'),
            lightColor: gl.getUniformLocation(Texture_shaderProgram, 'uLightColor'),
            lightDirection: gl.getUniformLocation(Texture_shaderProgram, 'uLightDirection'),
            ambient: gl.getUniformLocation(Texture_shaderProgram, 'uAmbientLight'),
        },
    };
    const fog_Texture_programInfo = {
        program: fog_Texture_shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(fog_Texture_shaderProgram, 'aVertexPosition'),
            normal: gl.getAttribLocation(fog_Texture_shaderProgram, 'aNormal'),
            TextCoord: gl.getAttribLocation(fog_Texture_shaderProgram, 'aTextCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(fog_Texture_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(fog_Texture_shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(fog_Texture_shaderProgram, 'uModelMatrix'),
            reverseModelMatrix: gl.getUniformLocation(fog_Texture_shaderProgram, 'uReverseModelMatrix'),
            Sampler: gl.getUniformLocation(fog_Texture_shaderProgram, 'uSampler'),
            lightColor: gl.getUniformLocation(fog_Texture_shaderProgram, 'uLightColor'),
            eyePosition: gl.getUniformLocation(fog_Texture_shaderProgram, 'uEyePosition'),
            lightDirection: gl.getUniformLocation(fog_Texture_shaderProgram, 'uLightDirection'),
            ambient: gl.getUniformLocation(fog_Texture_shaderProgram, 'uAmbientLight'),
            fogDensity: gl.getUniformLocation(fog_Texture_shaderProgram, 'uFogDenisty'),
            CubeSampler: gl.getUniformLocation(fog_Texture_shaderProgram, 'uCubeSampler')
        },
    };
    gl.clearColor(0.5, 0.5, 0.5, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    return {
        canvas: canvas,
        gl: gl,
        programInfo: programInfo,
        fog_programInfo: fog_programInfo,
        sky_programInfo: sky_programInfo,
        fogsky_programInfo: fogsky_programInfo,
        Texture_programInfo: Texture_programInfo,
        fog_Texture_programInfo: fog_Texture_programInfo,
    }
}

function initShaderProgram(gl, vsSource, fsSource) {
    //加载顶点着色器、片段着色器
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    //创建着色器程序
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //链接
    gl.linkProgram(shaderProgram);

    return shaderProgram;
}


var mouseDown = false;
var lastMouseX = 0;
var lastMouseY = 0;
function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}
function handleMouseUp() {
    mouseDown = false;
}
function handleMouseOut() {
    mouseDown = false;
}
function handleMouseMove(event) {
    if (!mouseDown) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;
    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;
    var radx = 0.0, rady = 0.0;
    const viewRotationMatrix = mat4.create();

    //旋转角度radx，横向拖动时的变化，将其转化到弧度
    radx = -1 * (2 * Math.PI) * deltaX * 0.5 / cw;
    //旋转角度rady，纵向拖动时的变化，将其转化到弧度
    rady = (2 * Math.PI) * deltaY * 0.5 / ch;
    //获取视点，up向量,和目标点三个三维向量确立视角坐标系
    var vec3_eye = vec3.fromValues(eye[0], eye[1], eye[2]);
    var vec3_up = vec3.fromValues(up[0], up[1], up[2]);
    var vec3_target = vec3.fromValues(target[0], target[1], target[2]);
    //求出视线方向
    var vec3_eye2target = vec3.create();
    vec3.subtract(vec3_eye2target, vec3_eye, vec3_target);
    //求出横向旋转的方向，即y方向绕其旋转
    var vec3_rotation_y = vec3.create();
    vec3.cross(vec3_rotation_y, vec3_eye2target, vec3_up);
    var rotation_y = [vec3_rotation_y[0], vec3_rotation_y[1], vec3_rotation_y[2]];
    //x方向绕up旋转，通过rotate变换绕两方向旋转得出变换矩阵
    mat4.rotate(viewRotationMatrix,
        viewRotationMatrix,
        radx,
        up);
    mat4.rotate(viewRotationMatrix,
        viewRotationMatrix,
        rady,
        rotation_y);

    //对视点和up向量进行旋转变换
    vec3.transformMat4(vec3_eye, vec3_eye, viewRotationMatrix);
    vec3.transformMat4(vec3_up, vec3_up, viewRotationMatrix);

    eye[0] = vec3_eye[0]; eye[1] = vec3_eye[1]; eye[2] = vec3_eye[2];
    up[0] = vec3_up[0]; up[1] = vec3_up[1]; up[2] = vec3_up[2];
    //mat4.lookAt(viewMatrix, eye, target, up);
    lastMouseX = newX;
    lastMouseY = newY;
}

function handleKeyDown(event) {
    //currentlyPressedKeys[event.keyCode] = true;
    if (String.fromCharCode(event.keyCode) == "W") {//加速，model和view同步
        speed += del;
    }
    else if (String.fromCharCode(event.keyCode) == "A") {//飞机向左的旋转效果
        translation[0] -= del;
        rotation.rad += del;
        rotation.aixs[0] = 1;
    }
    else if (String.fromCharCode(event.keyCode) == "S") {//减速，model和view同步
        if (speed > del) {
            speed -= del;
        }
    }
    else if (String.fromCharCode(event.keyCode) == "D") {//飞机向右的旋转效果
        translation[0] += del;
        rotation.rad -= del;
        rotation.aixs[0] = 1;
    }
}
function handleKeyUp(event) {
    rotation.aixs[0] = 0;
}



function initBuffers(gl, positions, colors, indices, normals) {
    //顶点缓冲区
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    //为颜色创建缓冲区
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    //索引缓冲区
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    //法向量缓冲区
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        index: indexBuffer,
        normal: normalBuffer,
        indices: indices,
    }
}

function initTextBuffers(gl, positions, colors, indices, normals, TextCoord) {
    //顶点缓冲区
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    //为颜色创建缓冲区
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    //索引缓冲区
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    //法向量缓冲区
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    //纹理缓冲区
    const TextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, TextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(TextCoord), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        index: indexBuffer,
        normal: normalBuffer,
        TextCoord: TextureBuffer,
        indices: indices,
    }
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//天空盒buffer，因为纹理坐标与世界坐标是对应的，使用原点到立方体的向量所采样的点即可实现映射，只需要positions信息即可
function initSkybox(Program) {
    var scale = 50;
    const positions = [
        // positions          
        -1.0 * scale, 1.0 * scale, -1.0 * scale,
        -1.0 * scale, -1.0 * scale, -1.0 * scale,
        1.0 * scale, -1.0 * scale, -1.0 * scale,
        1.0 * scale, -1.0 * scale, -1.0 * scale,
        1.0 * scale, 1.0 * scale, -1.0 * scale,
        -1.0 * scale, 1.0 * scale, -1.0 * scale,

        -1.0 * scale, -1.0 * scale, 1.0 * scale,
        -1.0 * scale, -1.0 * scale, -1.0 * scale,
        -1.0 * scale, 1.0 * scale, -1.0 * scale,
        -1.0 * scale, 1.0 * scale, -1.0 * scale,
        -1.0 * scale, 1.0 * scale, 1.0 * scale,
        -1.0 * scale, -1.0 * scale, 1.0 * scale,

        1.0 * scale, -1.0 * scale, -1.0 * scale,
        1.0 * scale, -1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, -1.0 * scale,
        1.0 * scale, -1.0 * scale, -1.0 * scale,

        -1.0 * scale, -1.0 * scale, 1.0 * scale,
        -1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, -1.0 * scale, 1.0 * scale,
        -1.0 * scale, -1.0 * scale, 1.0 * scale,

        -1.0 * scale, 1.0 * scale, -1.0 * scale,
        1.0 * scale, 1.0 * scale, -1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        1.0 * scale, 1.0 * scale, 1.0 * scale,
        -1.0 * scale, 1.0 * scale, 1.0 * scale,
        -1.0 * scale, 1.0 * scale, -1.0 * scale,

        -1.0 * scale, -1.0 * scale, -1.0 * scale,
        -1.0 * scale, -1.0 * scale, 1.0 * scale,
        1.0 * scale, -1.0 * scale, -1.0 * scale,
        1.0 * scale, -1.0 * scale, -1.0 * scale,
        -1.0 * scale, -1.0 * scale, 1.0 * scale,
        1.0 * scale, -1.0 * scale, 1.0 * scale
    ];

    //在positions中所有点信息已经列齐，index只需按序对应即可
    var indices = new Array();
    for (var i = 0; i < 36; i++)
        indices.push(i);

    const textureCoordBuffer = Program.gl.createBuffer();
    Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, textureCoordBuffer);
    Program.gl.bufferData(Program.gl.ARRAY_BUFFER, new Float32Array(positions), Program.gl.STATIC_DRAW);

    const indexBuffer = Program.gl.createBuffer();
    Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    Program.gl.bufferData(Program.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), Program.gl.STATIC_DRAW);

    return {
        textureCoord: textureCoordBuffer,
        index: indexBuffer,
    }

}

function initOneCube(Program, center, size, color) {
    const positions = [];
    const colors = [];
    const indices = [
        0, 1, 2,
        1, 2, 3,
        2, 3, 6,
        3, 6, 7,
        2, 6, 0,
        0, 6, 4,
        0, 4, 1,
        1, 4, 5,
        1, 5, 7,
        1, 3, 7,
        4, 5, 6,
        5, 6, 7
    ];
    {
        positions.push(center[0] + size[0] / 2); positions.push(center[1] + size[1] / 2); positions.push(center[2] + size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2); positions.push(center[1] + size[1] / 2); positions.push(center[2] + size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] + size[0] / 2); positions.push(center[1] - size[1] / 2); positions.push(center[2] + size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2); positions.push(center[1] - size[1] / 2); positions.push(center[2] + size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] + size[0] / 2); positions.push(center[1] + size[1] / 2); positions.push(center[2] - size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2); positions.push(center[1] + size[1] / 2); positions.push(center[2] - size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] + size[0] / 2); positions.push(center[1] - size[1] / 2); positions.push(center[2] - size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2); positions.push(center[1] - size[1] / 2); positions.push(center[2] - size[2] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
    }

    const buffers = initBuffers(Program.gl, positions, colors, indices);
    return buffers;
}

function initOneBall(Program, center, radius, color) {
    var positions = new Array();
    var normals = new Array();

    for (i = 0; i <= 180; i += 1) {//fai
        for (j = 0; j <= 360; j += 1) {//theata
            positions.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180) + center[0]);
            positions.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180) + center[1]);
            positions.push(radius * Math.cos(Math.PI * i / 180) + center[2]);
            normals.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180));
            normals.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180));
            normals.push(radius * Math.cos(Math.PI * i / 180));
        }
    }
    var colors = new Array();
    for (i = 0; i <= 180; i += 1) {
        for (j = 0; j <= 360; j += 1) {
            if (j < 175) {
                colors.push(color[0]);  //R
            }
            else {
                colors.push(0);  //R
            }
            colors.push(color[1]);  //G
            colors.push(color[2]);  //B
            colors.push(color[3]);  //Alpha
        }
    }
    var indices = new Array();
    for (i = 0; i < 180; i += 1) {//fai
        for (j = 0; j < 360; j += 1) {//theata
            indices.push(360 * i + j);
            indices.push(360 * i + (j + 1));
            indices.push(360 * (i + 1) + j);
            indices.push(360 * (i + 1) + j + 1);
            indices.push(360 * i + (j + 1));
            indices.push(360 * (i + 1) + j);
        }
    }
    const buffers = initBuffers(Program.gl, positions, colors, indices);
    return buffers;
}

function initTextureBall(Program, center, radius, color) {
    var positions = new Array();
    for (i = 0; i <= 180; i += 1) {//fai
        for (j = 0; j <= 360; j += 1) {//theata
            positions.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180) + center[0]);
            positions.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180) + center[1]);
            positions.push(radius * Math.cos(Math.PI * i / 180) + center[2]);
        }
    }
    var colors = new Array();
    for (i = 0; i <= 180; i += 1) {
        for (j = 0; j <= 360; j += 1) {
            colors.push(color[0]);  //R
            colors.push(color[1]);  //G
            colors.push(color[2]);  //B
            colors.push(color[3]);  //Alpha
        }
    }
    var indices = new Array();
    for (i = 0; i < 180; i += 1) {//fai
        for (j = 0; j < 360; j += 1) {//theata
            indices.push(360 * i + j);
            indices.push(360 * i + (j + 1));
            indices.push(360 * (i + 1) + j);
            indices.push(360 * (i + 1) + j + 1);
            indices.push(360 * i + (j + 1));
            indices.push(360 * (i + 1) + j);
        }
    }
    var normals = new Array();
    for (i = 0; i <= 180; i += 1) {//fai
        for (j = 0; j <= 360; j += 1) {//theata
            normals.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180));
            normals.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180));
            normals.push(radius * Math.cos(Math.PI * i / 180));
        }
    }
    var TextCoord = new Array();
    for (i = 0; i <= 180; i += 1) {//fai
        for (j = 0; j <= 360; j += 1) {//theata
            TextCoord.push(i / 180.0);
            TextCoord.push(j / 360.0);
        }
    }
    const buffers = initTextBuffers(Program.gl, positions, colors, indices, normals, TextCoord);
    return buffers;
}