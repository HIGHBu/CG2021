window.onload=function(){

    show();
    
    
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
    
    function initProgram(){
        //准备webGL的上下文：获取canvas的引用并保存在canvas变量里，并获取webGLRenderingContest并赋值给gl
        //gl会用来引用webGL上下文
        const canvas = document.querySelector('#glcanvas');
        const gl = canvas.getContext('webgl');
    
        if (!gl) {
            alert('Unable to initialize WebGL. Your browser or machine may not support it.');
            return;
        }
    
        //定义顶点着色器
        const vsSource = `
        attribute vec4 aVertexColor; //颜色属性，用四维向量表示（第四维无意义，用于计算）
        attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
    
        uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
        uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
        uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    
        varying lowp vec4 vColor;        //颜色varying类变量，用于向片段着色器传递颜色属性
    
        void main() {
          gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
          vColor = aVertexColor;        //点的颜色
        }
      `;
    
      //定义片段着色器
      const fsSource = `
        varying lowp vec4 vColor;
        void main() {
          gl_FragColor = vColor;
        }
      `;
    
        //初始化着色器程序
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    
        //收集着色器程序会用到的所有信息
        const programInfo = {
          program: shaderProgram,
          attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
          },
          uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
          },
        };
        return{
            canvas:canvas,
            gl:gl,
            programInfo:programInfo,
        }
    }
    
    function initBuffers(gl, positions, colors, indices){
        //初始化一个面的buffer
        // 1.顶点缓冲区
        // Create a buffer for the cube's vertex positions.
        const positionBuffer = gl.createBuffer();
        // Select the positionBuffer as the one to apply buffer
        // operations to from here out
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    
        // 2.创建纹理坐标到立方体各个面的顶点的映射关系
        // const textureCoordBuffer = gl.createBuffer();   //创建一个GL缓存区保存每个面的纹理坐标信息
        // gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer); //把这个缓存区绑定到GL
        // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
        //     gl.STATIC_DRAW);    //把这个数组里的数据都写到GL缓存区
        //为颜色创建缓冲区
        const colorBuffer = gl.createBuffer();
        //绑定缓冲区
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        //将colors数据传入webGL缓冲区
        gl.bufferData(gl.ARRAY_BUFFER, 
                      new Float32Array(colors),
                      gl.STATIC_DRAW);
    
        // 3.索引缓冲区
        // Build the element array buffer; this specifies the indices
        // into the vertex arrays for each face's vertices.
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // Now send the element array to GL
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices), gl.STATIC_DRAW);
        return{
            position: positionBuffer,
            color: colorBuffer,
            index: indexBuffer,
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
    
    function initOneCube(Program, center, size, color){
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
    
    function draw(Program, buffers, modelMatrix, viewMatrix, projectionMatrix){
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexPosition);
        }
              
        //为webGL设置从缓冲区抽取颜色数据的属性值，将其放入着色器信息
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.color);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexColor);
        }
            
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            
        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.programInfo.program);
            
        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
    
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount =  buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
        //rotation.rad += deltaTime;
    }

    function setModelMatrix(translation, rotation){
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix,     // destination matrix
            modelMatrix,     // matrix to translate
            translation);  // amount to translate
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            rotation.rad,     // amount to rotate in radians
            rotation.axis);       // axis to rotate around (Z)
        return modelMatrix;
    }

    function setViewMatrix(translation, rotation){
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix,     // destination matrix
            viewMatrix,     // matrix to translate
            translation);  // amount to translate
        mat4.rotate(viewMatrix,  // destination matrix
            viewMatrix,  // matrix to rotate
            rotation.rad,     // amount to rotate in radians
            rotation.axis);       // axis to rotate around (Z)
        return viewMatrix;
    }
    
    function setProjectionMatrix(gl){
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
    
        // note: glmatrix.js always has the first argument
        // as the destination to receive the result.
        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar);
        return projectionMatrix;
    }
    
    // var rotation = function(rad, axis){
    //     this.rad = rad;
    //     this.axis = axis;
    // };
    
    function show(){
        const Program = initProgram();
        var center = [0,0,0];
        var size = [3,4,5];
        var color = [1,0,0,1];
        var translation = [0,0,-6];
        //var rotation = (new rotation(0, [0,0,1]));
        var rotation = new Object();
        rotation.rad = 0;
        rotation.axis = [0,0,1];


        const Cubebuffer = initOneCube(Program, center, size, color);

        Program.gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        Program.gl.clearDepth(1.0);                 // Clear everything
        Program.gl.enable(Program.gl.DEPTH_TEST);           // Enable depth testing
        Program.gl.depthFunc(Program.gl.LEQUAL);            // Near things obscure far things
        Program.gl.clear(Program.gl.COLOR_BUFFER_BIT | Program.gl.DEPTH_BUFFER_BIT);

        var then = 0;

        // Draw the scene repeatedly
        function render(now) {
            now *= 0.001;  // convert to seconds
            const deltaTime = now - then;
            then = now;
            const modelMatrix = setModelMatrix(translation, rotation);
            const viewMatrix = setViewMatrix(translation, rotation);
            const projectionMatrix = setProjectionMatrix(Program.gl);
            draw(Program, Cubebuffer, modelMatrix, viewMatrix, projectionMatrix);
            rotation.rad += deltaTime;
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }
};
