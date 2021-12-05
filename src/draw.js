var objbuffers = [];
var objbuffers1 = [];
var eye = [0, 0, 6];
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;


var speed = 1;
var del = 0.1;
var translation = [0, 0, -6];

var Rotation = function (rad, axis) {
    this.rad = rad;
    this.axis = axis;
}
var rotation = new Rotation(0, [0, 0, 1]);






window.onload = function () {
    //var objDocs = [];      // The information of OBJ file
    //var objInfos = [];
    var lightColor = vec3.fromValues(1.0, 1.0, 1.0);
    var ambientLight = vec3.fromValues(0.4, 0.4, 0.4);
    var lightPosition = vec3.fromValues(0, 0, 0);

    //天空盒的绘制部分，其纹理坐标与世界坐标是对应的，所以只需要绑定纹理坐标和index信息
    function drawSkybox(Program, buffer, skybox, viewMatrix, projectionMatrix){
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.textureCoord);
            Program.gl.vertexAttribPointer(
                Program.sky_programInfo.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.sky_programInfo.attribLocations.textureCoord);
        }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffer.index);
        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.sky_programInfo.program);
        //Program.gl.activeTexture(gl.TEXTURE0);
        Program.gl.bindTexture(Program.gl.TEXTURE_CUBE_MAP, skybox);
        // Tell the shader we bound the texture to texture unit 0
        Program.gl.uniform1i(Program.sky_programInfo.uniformLocations.uSampler, 0);
        Program.gl.uniformMatrix4fv(
            Program.sky_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.sky_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = 36;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function draw(Program, buffers, modelMatrix, viewMatrix, projectionMatrix) {
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
        //为webGL设置从缓冲区抽取法向量数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.normal);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexNormal);
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
        //用于计算新法向量的矩阵
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uLightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uAmbientLight,
            ambientLight);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uLightPosition,
            lightPosition);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function setModelMatrix(translation, rotation) {
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
    //设置视角矩阵，根据视点，目标点和上方向确定视角矩阵
    function setViewMatrix() {
        //设置view坐标系
        const ViewMatrix = mat4.create();
        mat4.lookAt(ViewMatrix, eye, target, up);
        return ViewMatrix;
    }
    function setProjectionMatrix(gl) {
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar);
        return projectionMatrix;
    }

    show();

    function show() {
        const Program = initProgram();
        //天空盒对应的纹理，为http://www.cad.zju.edu.cn/home/hwu/cg.html 中提供的环境纹理
        var skybox_urls = [
            "../texture/pavilion_skybox/right.png",
            "../texture/pavilion_skybox/left.png",
            "../texture/pavilion_skybox/up.png",
            "../texture/pavilion_skybox/down.png",
            "../texture/pavilion_skybox/back.png",
            "../texture/pavilion_skybox/front.png",
        ];
        var skybox = loadSkybox(Program.gl, skybox_urls);
        var center = [0, 0, 0];
        var size = [3, 4, 5];
        var color = [1, 0, 0, 1];
        var center1 = [0.0, 0.0, 0.0];
        var center2 = [0.5, 0.0, 0.0];
        var center3 = [0.0, 0.5, 0.0];
        var center4 = [0, 0.15, 0.0];
        var radius1 = 0.2;
        var radius2 = 0.15;
        var radius3 = 0.15;
        var radius4 = 0.1;
        var color1 = [220 / 255.0, 47 / 255.0, 31 / 255.0, 1.0];//Red
        var color2 = [80 / 255.0, 24 / 255.0, 21 / 255.0, 1.0];//Black
        var color3 = [60 / 255.0, 107 / 255.0, 176 / 255.0, 1.0];//Blue
        var color4 = [239 / 255.0, 169 / 255.0, 13 / 255.0, 1.0];//Yellow
        const Cubebuffer = initOneCube(Program, center, size, color);
        const ballbuffer1 = initOneBall(Program, center1, radius1, color1);
        const ballbuffer2 = initOneBall(Program, center2, radius2, color2);
        const ballbuffer3 = initOneBall(Program, center3, radius3, color3);
        const ballbuffer4 = initOneBall(Program, center4, radius4, color4);
        const skyboxbuffer = initSkybox(Program);

        // LoadObjFile(Program.gl, '../obj/cube.obj', objbuffers, 3, false, 0);

        LoadObjFile(Program.gl, '../obj/plane_min/obj.obj', objbuffers, 0.003, color1, false);
        LoadObjFile(Program.gl, '../obj/toy_plane.obj', objbuffers, 0.003, color3, false);

        //const objbuffer = initOneObj(Program, objpositions, objcolors, objindices, 0);
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
            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();

            // const modelMatrix = setModelMatrix(translation, rotation);
            const modelMatrix1 = setModelMatrix(translation, rotation);
            const modelMatrix2 = setModelMatrix(translation, rotation);
            const modelMatrix3 = setModelMatrix(translation, rotation);
            const modelMatrix4 = setModelMatrix(translation, rotation);
            const modelMatrix5 = setModelMatrix([0, 0, 0], rotation);
            const modelMatrix6 = setModelMatrix([0, 0.5, 0], rotation);

            requestAnimationFrame(render);
            // draw(Program, Cubebuffer, modelMatrix, projectionMatrix);
            drawSkybox(Program, skyboxbuffer, skybox, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix);
            if (objbuffers[0])
                draw(Program, objbuffers[0], modelMatrix5, viewMatrix, projectionMatrix);
            if (objbuffers[1])
                draw(Program, objbuffers[1], modelMatrix6, viewMatrix, projectionMatrix);
            translation[2] += deltaTime * speed;//让飞机每秒都按速度向前
            // eye[2] -= deltaTime * speed;
            // target[2] -= deltaTime * speed;
        }
        requestAnimationFrame(render);
    }

};