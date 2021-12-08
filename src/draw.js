var objbuffers = [];
var objDocArray = [];
var mtlDocArray = [];

var eye = [0, 0, 6];
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;

var speed = 1;
var del = 0.1;
var translation = [0, 0, 0];
var nochange_translation = [0, 0, -6];

var Rotation = function (rad, axis) {
    this.rad = rad;
    this.axis = axis;
}
var rotation = new Rotation(0, [0, 0, 1]);
var nochange_rotation = new Rotation(0, [0, 1, 0]);

var modelxrotation = new Rotation(Math.PI / 2, [1, 0, 0]);
var modelyrotation = new Rotation(Math.PI, [0, 1, 0]);
var modelzrotation = new Rotation(0, [0, 0, 1]);

window.onload = function () {
    var lightColor = vec3.fromValues(1.0, 1.0, 1.0);
    var ambientLight = vec3.fromValues(0.4, 0.4, 0.4);
    var lightDirection = vec3.fromValues(0, 0, -1);

    function initTextures(Program, gl, filepath, index) {
        var texture = gl.createTexture(); // Create texture
        // var Sampler = Program.programInfo2.uniformLocations.Sampler;
        var image = new Image(); // Create a image
        image.onload = function () { loadTexture(gl, texture, image, index); };
        image.src = filepath;
        return true;
    }

    function loadTexture(gl, texture, image, index) {
        //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0 + index);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        // Check if the image is a power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else {
            // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    }

    //天空盒的绘制部分，其纹理坐标与世界坐标是对应的，所以只需要绑定纹理坐标和index信息
    function drawSkybox(Program, buffer, skybox, viewMatrix, projectionMatrix) {
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
            Program.programInfo.uniformLocations.uLightDirection,
            lightDirection);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function drawTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.Texture_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.Texture_programInfo.attribLocations.vertexPosition);
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
                Program.Texture_programInfo.attribLocations.normal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.Texture_programInfo.attribLocations.normal);
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
                Program.Texture_programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.Texture_programInfo.attribLocations.vertexColor);
        }
        //为webGL设置从缓冲区抽取纹理数据的属性值，将其放入着色器信息
        {
            const numComponents = 2;//每次取出2个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.TextCoord);
            Program.gl.vertexAttribPointer(
                Program.Texture_programInfo.attribLocations.TextCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.Texture_programInfo.attribLocations.TextCoord);
        }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.Texture_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.Texture_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.Texture_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.Texture_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        const reverseModelMat = mat4.create();
        mat4.invert(reverseModelMat, modelMatrix);
        mat4.transpose(reverseModelMat, reverseModelMat);
        Program.gl.uniformMatrix4fv(
            Program.Texture_programInfo.uniformLocations.reverseModelMatrix,
            false,
            reverseModelMat);
        Program.gl.uniform3fv(
            Program.Texture_programInfo.uniformLocations.lightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.Texture_programInfo.uniformLocations.lightDirection,
            lightDirection);
        Program.gl.uniform3fv(
            Program.Texture_programInfo.uniformLocations.eyePosition,
            eye);
        Program.gl.uniform3fv(
            Program.Texture_programInfo.uniformLocations.ambient,
            ambientLight);
        Program.gl.uniform1i(
            Program.Texture_programInfo.uniformLocations.Sampler,
            num);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    //设置模型矩阵，translation为模型的平移，rotation为模型的旋转。modelrotation，modelrotation用于模型的方向修正
    function setModelMatrix(translation, rotation, modelxrotation, modelyrotation, modelzrotation,) {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix,     // destination matrix
            modelMatrix,     // matrix to translate
            translation);  // amount to translate
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            rotation.rad,     // amount to rotate in radians
            rotation.axis);       // axis to rotate around (Z)
        if (modelxrotation)
            mat4.rotate(modelMatrix,  // destination matrix
                modelMatrix,  // matrix to rotate
                modelxrotation.rad,     // amount to rotate in radians
                modelxrotation.axis);       // axis to rotate around (Z)
        if (modelyrotation)
            mat4.rotate(modelMatrix,  // destination matrix
                modelMatrix,  // matrix to rotate
                modelyrotation.rad,     // amount to rotate in radians
                modelyrotation.axis);       // axis to rotate around (Z)     
        if (modelzrotation)
            mat4.rotate(modelMatrix,  // destination matrix
                modelMatrix,  // matrix to rotate
                modelzrotation.rad,     // amount to rotate in radians
                modelzrotation.axis);       // axis to rotate around (Z)           
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
        var text_filepath1 = '../res/sun.jpg';
        var text_filepath2 = '../res/mercury.jpg';
        var text_filepath3 = '../res/earth.jpg';
        var text_filepath4 = '../res/moon.jpg';
        var text_filepath5 = '../texture/plane.jpg';
        const Cubebuffer = initOneCube(Program, center, size, color);
        const ballbuffer1 = initTextureBall(Program, center1, radius1, color1);
        const ballbuffer2 = initTextureBall(Program, center2, radius2, color2);
        const ballbuffer3 = initTextureBall(Program, center3, radius3, color3);
        const ballbuffer4 = initTextureBall(Program, center4, radius4, color4);
        const skyboxbuffer = initSkybox(Program);

        LoadObjFile(Program.gl, '../obj/VLJ19OBJ.obj', objDocArray, mtlDocArray, 0.8, false);
        //LoadObjFile(Program.gl, '../obj/toy_plane.obj', objbuffers, 0.003, false);

        //const objbuffer = initOneObj(Program, objpositions, objcolors, objindices, 0);
        initTextures(Program, Program.gl, text_filepath1, 0);
        initTextures(Program, Program.gl, text_filepath2, 1);
        initTextures(Program, Program.gl, text_filepath3, 2);
        initTextures(Program, Program.gl, text_filepath4, 3);
        initTextures(Program, Program.gl, text_filepath5, 4);
        var then = 0;
        // Draw the scene repeatedly
        function render(now) {
            now *= 0.001;  // convert to seconds
            const deltaTime = now - then;
            then = now;
            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();

            // const modelMatrix = setModelMatrix(translation, rotation);
            const modelMatrix1 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix2 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix3 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix4 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix5 = setModelMatrix(translation, rotation, modelxrotation, modelyrotation, modelzrotation);
            const modelMatrix6 = setModelMatrix(nochange_translation, nochange_rotation);

            requestAnimationFrame(render);
            // draw(Program, Cubebuffer, modelMatrix, projectionMatrix);
            if(mtlDocArray[0] && objDocArray[0]){
                getDrawingInfo(Program.gl, objbuffers, objDocArray[0], mtlDocArray[0]);
                if (objbuffers[0])
                    drawTexture(Program, objbuffers[0], modelMatrix5, viewMatrix, projectionMatrix, 4);
            }
            drawSkybox(Program, skyboxbuffer, skybox, viewMatrix, projectionMatrix);
            drawTexture(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix, 0);
            drawTexture(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix, 1);
            drawTexture(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix, 2);
            drawTexture(Program, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix, 3);
            // if (objbuffers[1])
            //     draw(Program, objbuffers[1], modelMatrix6, viewMatrix, projectionMatrix);
            nochange_translation[2] += deltaTime * speed;//让飞机每秒都按速度向前
        }
        requestAnimationFrame(render);
    }

};

function getDrawingInfo(gl, buffers, objDocs, mtlDocs){

    var positions = new Array(0);
    var indices = new Array(0);
    var normals = new Array(0);
    var textureCoords = new Array(0);
    var colors = new Array(0);
    var numIndices = 0;
    for(var i = 0; i < objDocs.objects.length; i++){
        numIndices += objDocs.objects[i].numIndices;
        //每一个objects[i].numIndices 是它的所有的face的顶点数加起来
    }
    // for(var i = 0; i < objDocs.textureCoords.length; i++)
    //     textureCoords.push(objDocs.textureCoords[i].x, objDocs.textureCoords[i].y);
    var index_indices = 0;
    for(var i = 0; i < objDocs.objects.length; i++){
        var currentObject = objDocs.objects[i];
        for(var j = 0; j < currentObject.faces.length; j++){
            var currentFace = currentObject.faces[j];
            for(var k = 0; k < currentFace.vIndices.length; k++){
              colors.push(0.8, 0.8, 0.8, 1);
              indices.push(index_indices % numIndices);
              var vIdx = currentFace.vIndices[k];
              var tIdx = currentFace.tIndices[k];
              var nIdx = currentFace.nIndices[k];
              positions.push(objDocs.vertices[vIdx].x, objDocs.vertices[vIdx].y, objDocs.vertices[vIdx].z);
              if(tIdx >= 0)
                  textureCoords.push(objDocs.textureCoords[tIdx].x, objDocs.textureCoords[tIdx].y);
              else
                  textureCoords.push(0, 0);
              if(nIdx >= 0)
                  normals.push(objDocs.normals[nIdx].x, objDocs.normals[nIdx].y, objDocs.normals[nIdx].z);
              else
                  normals.push(currentFace.normal[0], currentFace.normal[1], currentFace.normal[2]);  
              index_indices++;
            }
        }
    }
    temp = initTextBuffers(gl, positions, colors, indices, normals, textureCoords);
    buffers.push(temp);

}