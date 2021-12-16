var weather = 1;//0代表晴天，1代表雾天
var score = 0;//获得分数
var crash = 0;//坠毁标志
var boom_time = 1000;//爆炸用计时器
var objbuffers = [];
var objDocArray = [];
var mtlDocArray = [];

var frame = 0;  // 帧数
var fps_time = 0;   // 用于计算帧数的时间
var show_frame;

var crashObjSet = [];   // 碰撞物体
var planeSize = 0.6;

var eye = [0, 0, 6];
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;

var speed = 0;
var del = 0.1;
var translation = [0, 0, 0];            // 飞机的平移矩阵
var nochange_translation = [0, 0, -10];  // 物体的平移矩阵
var lightColor = [1.0, 1.0, 1.0];
var ambientLight = [0.4, 0.4, 0.4];
var lightDirection = [1.0, 1.0, 0.0];
var fogdenisty = 0.3;

var light_Scale = 20.0;
var LIGHT_X = -lightDirection[0] * light_Scale, LIGHT_Y = -lightDirection[1] * light_Scale, LIGHT_Z = -lightDirection[2] * light_Scale;


var Rotation = function (rad, axis) {
    this.rad = rad;
    this.axis = axis;
}
var rotation = new Rotation(0, [0, 0, 1]);
var nochange_rotation = new Rotation(0, [0, 1, 0]);

var modelxrotation = new Rotation(Math.PI / 2, [1, 0, 0]);
var modelyrotation = new Rotation(Math.PI, [0, 1, 0]);
var modelzrotation = new Rotation(0, [0, 0, 1]);
function change_weather() {
    weather = 1 - weather;
}
function change_crash() {
    crash = 1 - crash;
    boom_time = 0;
}
function draw2D(ctx) {

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    frame++;
    var curTime = new Date().getTime();
    if (curTime - fps_time > 1000) {
        fps_time = curTime;
        show_frame = frame;
        frame = 0;
    }
    ctx.font = '18px "Times New Roman"';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillText('Current Speed:' + Math.floor(speed * 10) / 10.0, window.innerWidth - 300, window.innerHeight - 100);
    ctx.fillText('Current Rotation:' + Math.floor(rotation.rad * 100) / 100.0, window.innerWidth - 300, window.innerHeight - 80);
    ctx.fillText('Current Score:' + Math.floor(score), window.innerWidth - 300, window.innerHeight - 60);
    ctx.fillText("FPS: " + show_frame, 50, 20);
}
function initTextures(Program, gl, filepath, index) {
    var texture = gl.createTexture(); // Create texture
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
function drawSkybox(Program, buffer, time, skybox, viewMatrix, projectionMatrix) {
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
    const resolution = vec2.fromValues(cw, ch);
    Program.gl.uniform2fv(
        Program.sky_programInfo.uniformLocations.uResolution,
        resolution);
    const eyePosition = vec3.fromValues(eye[0], eye[1], eye[2]);
    Program.gl.uniform3fv(
        Program.sky_programInfo.uniformLocations.eyePosition,
        eyePosition);
    const targetPosition = vec3.fromValues(target[0], target[1], target[2]);
    Program.gl.uniform3fv(
        Program.sky_programInfo.uniformLocations.targetPosition,
        targetPosition);
    const upPosition = vec3.fromValues(up[0], up[1], up[2]);
    Program.gl.uniform3fv(
        Program.sky_programInfo.uniformLocations.up,
        upPosition);
    Program.gl.uniform3fv(
        Program.sky_programInfo.uniformLocations.lightDirection,
        lightDirection);
    Program.gl.uniform1f(
        Program.sky_programInfo.uniformLocations.time,
        time);
    {
        const offset = 0;
        const type = Program.gl.UNSIGNED_SHORT;
        const vertexCount = 36;
        //按连续的三角形方式以此按点绘制
        Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
    }
}

//雾天天空盒的绘制部分，其纹理坐标与世界坐标是对应的，所以只需要绑定纹理坐标和index信息
function drawfogSkybox(Program, buffer, skybox, viewMatrix, projectionMatrix) {
    {
        const numComponents = 3;//每次取出3个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.textureCoord);
        Program.gl.vertexAttribPointer(
            Program.fogsky_programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.fogsky_programInfo.attribLocations.textureCoord);
    }
    // Tell WebGL which indices to use to index the vertices
    Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffer.index);
    //webGL使用此程序进行绘制
    Program.gl.useProgram(Program.fogsky_programInfo.program);
    //Program.gl.activeTexture(gl.TEXTURE0);
    Program.gl.bindTexture(Program.gl.TEXTURE_CUBE_MAP, skybox);
    // Tell the shader we bound the texture to texture unit 0
    Program.gl.uniform1i(Program.fogsky_programInfo.uniformLocations.uSampler, 0);
    Program.gl.uniformMatrix4fv(
        Program.fogsky_programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    Program.gl.uniformMatrix4fv(
        Program.fogsky_programInfo.uniformLocations.viewMatrix,
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

function drawParticle(Program, buffers, time, modelMatrix, viewMatrix, projectionMatrix) {
    //为webGL设置从缓冲区抽取start数据的属性值，将其放入着色器信息
    {
        const numComponents = 3;//每次取出3个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.start);
        Program.gl.vertexAttribPointer(
            Program.particle_programInfo.attribLocations.start,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.particle_programInfo.attribLocations.start);
    }
    //为webGL设置从缓冲区抽取end数据的属性值，将其放入着色器信息
    {
        const numComponents = 3;//每次取出3个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.end);
        Program.gl.vertexAttribPointer(
            Program.particle_programInfo.attribLocations.end,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.particle_programInfo.attribLocations.end);
    }//为webGL设置从缓冲区抽取lifetime数据的属性值，将其放入着色器信息
    {
        const numComponents = 1;//每次取出1个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.lifetime);
        Program.gl.vertexAttribPointer(
            Program.particle_programInfo.attribLocations.lifetime,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.particle_programInfo.attribLocations.lifetime);
    }
    Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);
    //webGL使用此程序进行绘制
    Program.gl.useProgram(Program.particle_programInfo.program);

    // 设置着色器的uniform型变量
    Program.gl.uniformMatrix4fv(
        Program.particle_programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    Program.gl.uniformMatrix4fv(
        Program.particle_programInfo.uniformLocations.viewMatrix,
        false,
        viewMatrix);
    Program.gl.uniformMatrix4fv(
        Program.particle_programInfo.uniformLocations.modelMatrix,
        false,
        modelMatrix);
    Program.gl.uniform1f(
        Program.particle_programInfo.uniformLocations.time,
        time
    );
    {
        const offset = 0;
        const type = Program.gl.UNSIGNED_SHORT;
        const vertexCount = buffers.indices.length;
        //按连续的点方式以此按点绘制
        Program.gl.drawElements(Program.gl.POINTS, vertexCount, type, offset);
    }
}
function drawPlane(Program, buffer, modelMatrix, viewMatrix, projectionMatrix, viewMatrixFromLight, projectionMatrixFromLight) {
    {
        const numComponents = 3;//每次取出3个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.position);
        Program.gl.vertexAttribPointer(
            Program.plane_programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.plane_programInfo.attribLocations.vertexPosition);
    }
    //为webGL设置从缓冲区抽取颜色数据的属性值，将其放入着色器信息
    {
        const numComponents = 4;//每次取出4个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.color);
        Program.gl.vertexAttribPointer(
            Program.plane_programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.plane_programInfo.attribLocations.vertexColor);
    }
    // Tell WebGL which indices to use to index the vertices
    Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffer.index);
    //webGL使用此程序进行绘制
    Program.gl.useProgram(Program.plane_programInfo.program);
    Program.gl.uniform1i(Program.plane_programInfo.uniformLocations.uShadowMap, 7);
    Program.gl.uniformMatrix4fv(
        Program.plane_programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    Program.gl.uniformMatrix4fv(
        Program.plane_programInfo.uniformLocations.viewMatrix,
        false,
        viewMatrix);
    Program.gl.uniformMatrix4fv(
        Program.plane_programInfo.uniformLocations.projectionMatrixFromLight,
        false,
        projectionMatrixFromLight);
    Program.gl.uniformMatrix4fv(
        Program.plane_programInfo.uniformLocations.viewMatrixFromLight,
        false,
        viewMatrixFromLight);
    Program.gl.uniformMatrix4fv(
        Program.plane_programInfo.uniformLocations.modelMatrix,
        false,
        modelMatrix);
    {
        const offset = 0;
        const type = Program.gl.UNSIGNED_SHORT;
        const vertexCount = buffer.indices.length;
        //按连续的三角形方式以此按点绘制
        Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
    }
}
window.onload = function () {

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

    function drawFog(Program, buffers, modelMatrix, viewMatrix, projectionMatrix) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.fog_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_programInfo.attribLocations.vertexPosition);
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
                Program.fog_programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_programInfo.attribLocations.vertexNormal);
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
                Program.fog_programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_programInfo.attribLocations.vertexColor);
        }

        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.fog_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.fog_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.fog_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.fog_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        //用于计算新法向量的矩阵
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        Program.gl.uniformMatrix4fv(
            Program.fog_programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);
        Program.gl.uniform3fv(
            Program.fog_programInfo.uniformLocations.uEyePosition,
            eye);
        Program.gl.uniform3fv(
            Program.fog_programInfo.uniformLocations.uLightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.fog_programInfo.uniformLocations.uAmbientLight,
            ambientLight);
        Program.gl.uniform3fv(
            Program.fog_programInfo.uniformLocations.uLightDirection,
            lightDirection);
        Program.gl.uniform1f(
            Program.fog_programInfo.uniformLocations.uFogDenisty,
            fogdenisty);
        Program.gl.uniform1i(
            Program.fog_programInfo.uniformLocations.uSampler,
            0);
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
    function drawMTLTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.MTLTexture_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.vertexPosition);
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
                Program.MTLTexture_programInfo.attribLocations.normal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.normal);
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
                Program.MTLTexture_programInfo.attribLocations.TextCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.TextCoord);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.ambientLight);
            Program.gl.vertexAttribPointer(
                Program.MTLTexture_programInfo.attribLocations.ambientLight,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.ambientLight);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.diffuse_color);
            Program.gl.vertexAttribPointer(
                Program.MTLTexture_programInfo.attribLocations.diffuse_color,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.diffuse_color);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.specular_color);
            Program.gl.vertexAttribPointer(
                Program.MTLTexture_programInfo.attribLocations.specular_color,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLTexture_programInfo.attribLocations.specular_color);
        }
        // {
        //     const numComponents = 4;//每次取出4个数值
        //     const type = Program.gl.FLOAT;//取出数据为浮点数类型
        //     const normalize = false;
        //     const stride = 0;
        //     const offset = 0;
        //     Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.color);
        //     Program.gl.vertexAttribPointer(
        //         Program.Texture_programInfo.attribLocations.color,
        //         numComponents,
        //         type,
        //         normalize,
        //         stride,
        //         offset);
        //     Program.gl.enableVertexAttribArray(
        //         Program.Texture_programInfo.attribLocations.color);
        // }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.MTLTexture_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.MTLTexture_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.MTLTexture_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.MTLTexture_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        const reverseModelMat = mat4.create();
        mat4.invert(reverseModelMat, modelMatrix);
        mat4.transpose(reverseModelMat, reverseModelMat);
        Program.gl.uniformMatrix4fv(
            Program.MTLTexture_programInfo.uniformLocations.reverseModelMatrix,
            false,
            reverseModelMat);
        Program.gl.uniform3fv(
            Program.MTLTexture_programInfo.uniformLocations.lightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.MTLTexture_programInfo.uniformLocations.lightDirection,
            lightDirection);
        // Program.gl.uniform3fv(
        //     Program.Texture_programInfo.uniformLocations.ambient,
        //     ambientLight);
        var eyePosition = vec3.fromValues(eye[0], eye[1], eye[2]);
        Program.gl.uniform3fv(
            Program.MTLTexture_programInfo.uniformLocations.eyePosition,
            eyePosition);
        Program.gl.uniform1f(
            Program.MTLTexture_programInfo.uniformLocations.roughness,
            0.3);
        Program.gl.uniform1f(
            Program.MTLTexture_programInfo.uniformLocations.fresnel,
            0.04);

        Program.gl.uniform1i(
            Program.MTLTexture_programInfo.uniformLocations.Sampler,
            num);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function drawfogTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.fog_Texture_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_Texture_programInfo.attribLocations.vertexPosition);
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
                Program.fog_Texture_programInfo.attribLocations.normal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_Texture_programInfo.attribLocations.normal);
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
                Program.fog_Texture_programInfo.attribLocations.TextCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.fog_Texture_programInfo.attribLocations.TextCoord);
        }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.fog_Texture_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.fog_Texture_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.fog_Texture_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.fog_Texture_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        const reverseModelMat = mat4.create();
        mat4.invert(reverseModelMat, modelMatrix);
        mat4.transpose(reverseModelMat, reverseModelMat);
        Program.gl.uniformMatrix4fv(
            Program.fog_Texture_programInfo.uniformLocations.reverseModelMatrix,
            false,
            reverseModelMat);
        Program.gl.uniform3fv(
            Program.fog_Texture_programInfo.uniformLocations.lightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.fog_Texture_programInfo.uniformLocations.lightDirection,
            lightDirection);
        Program.gl.uniform3fv(
            Program.fog_Texture_programInfo.uniformLocations.eyePosition,
            eye);
        Program.gl.uniform3fv(
            Program.fog_Texture_programInfo.uniformLocations.ambient,
            ambientLight);
        Program.gl.uniform1i(
            Program.fog_Texture_programInfo.uniformLocations.Sampler,
            num);
        Program.gl.uniform1f(
            Program.fog_Texture_programInfo.uniformLocations.fogDenisty,
            fogdenisty);
        Program.gl.uniform1i(
            Program.fog_Texture_programInfo.uniformLocations.CubeSampler,
            5);//不能是导入其他纹理用到的sampler号
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }

    function drawShadow(Program, buffers, modelMatrix, viewMatrix, projectionMatrix) {

        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.shadow_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.shadow_programInfo.attribLocations.vertexPosition);
        }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.shadow_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.shadow_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.shadow_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.shadow_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
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

    //设置光看的视角矩阵，根据视点，目标点和上方向确定视角矩阵
    function setViewMatrixFromLight() {
        //设置view坐标系
        var light_eye = [LIGHT_X, LIGHT_Y, LIGHT_Z];
        var light_target = [0.0, 0.0, 0.0];
        const ViewMatrix = mat4.create();
        // mat4.lookAt(ViewMatrix, light_eye, light_target, up);   
        mat4.lookAt(ViewMatrix, light_eye, target, up);
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

    function setProjectionMatrixFromLight(gl) {
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT;
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

    class crashObj {
        constructor(center, dx, dy, dz) {
            this.center = center;
            this.dx = dx;
            this.dy = dy;
            this.dz = dz;
        }
        check(px, py, pz) {
            return (Math.abs(this.center[0] + nochange_translation[0] - translation[0]) < px + this.dx) &&
                (Math.abs(this.center[1] + nochange_translation[1] - translation[1]) < py + this.dy) &&
                (Math.abs(this.center[2] + nochange_translation[2] - translation[2]) < pz + this.dz);
        }
    }

    // 碰撞检测: crash - 坠毁标志
    function checkCollision() {
        if (crash) return;
        // 遍历所有obj
        var px = Math.abs(2.5 * planeSize * Math.cos(rotation.rad));
        var py = Math.abs(planeSize * Math.sin(rotation.rad));
        for (let i = 0; i < crashObjSet.length; i++) {
            if (crashObjSet[i].check(px, py, 2 * planeSize)) {
                speed = 0;
                crash = 1 - crash;
                boom_time = 0;
                break;
            }
        }
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
        var size_plane = [10.0, 10.0];
        var color = [1, 0, 0, 1];
        var center1 = [0.0, 0.0, 0.0];
        var center2 = [2.0, 0.0, 0.0];
        var center3 = [0.0, 2.0, 0.0];
        var center4 = [6.0, 4.0, 0.0];
        var center5 = [0.0, -1.0, 0.0];
        var radius1 = 0.8;
        var radius2 = 0.6;
        var radius3 = 0.6;
        var radius4 = 0.4;

        // crashObjSet
        crashObjSet.push(new crashObj(center1, radius1, radius1, radius1));
        crashObjSet.push(new crashObj(center2, radius2, radius2, radius2));
        crashObjSet.push(new crashObj(center3, radius3, radius3, radius3));
        crashObjSet.push(new crashObj(center4, radius4, radius4, radius4));

        var color1 = [220 / 255.0, 47 / 255.0, 31 / 255.0, 1.0];    //Red
        var color2 = [80 / 255.0, 24 / 255.0, 21 / 255.0, 1.0];     //Black
        var color3 = [60 / 255.0, 107 / 255.0, 176 / 255.0, 1.0];   //Blue
        var color4 = [239 / 255.0, 169 / 255.0, 13 / 255.0, 1.0];   //Yellow
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
        const particlebuffer = initBoomParticle(Program, center, 1.2, 0.5);
        const planebuffer = initPlane(Program, center5, size_plane, color1);
        const skyboxbuffer = initSkybox(Program);

        LoadObjFile(Program.gl, '../obj/VLJ19OBJ.obj', objDocArray, mtlDocArray, planeSize, false);

        var fbo = initFramebufferObject(Program.gl);
        if (!fbo) {
            console.log('Failed to initialize frame buffer object');
            return;
        }
        Program.gl.activeTexture(Program.gl.TEXTURE7); // Set a texture object to the texture unit
        Program.gl.bindTexture(Program.gl.TEXTURE_2D, fbo.texture);
        // Set the clear color and enable the depth test
        Program.gl.clearColor(0, 0, 0, 1);
        Program.gl.enable(Program.gl.DEPTH_TEST);

        //const objbuffer = initOneObj(Program, objpositions, objcolors, objindices, 0);
        initTextures(Program, Program.gl, text_filepath1, 0);
        initTextures(Program, Program.gl, text_filepath2, 1);
        initTextures(Program, Program.gl, text_filepath3, 2);
        initTextures(Program, Program.gl, text_filepath4, 3);
        initTextures(Program, Program.gl, text_filepath5, 4);
        var then = 0;
        // Draw the scene repeatedly
        function render(now) {
            checkCollision();
            now *= 0.001;  // convert to seconds
            const deltaTime = now - then;
            then = now;
            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();
            const projectionMatrixFromLight = setProjectionMatrixFromLight(Program.gl);
            const viewMatrixFromLight = setViewMatrixFromLight();

            // const modelMatrix = setModelMatrix(translation, rotation);
            const modelMatrix1 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix2 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix3 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix4 = setModelMatrix(nochange_translation, nochange_rotation);
            const modelMatrix5 = setModelMatrix(translation, rotation, modelxrotation, modelyrotation, modelzrotation);
            const modelMatrix6 = setModelMatrix(translation, rotation);
            const modelMatrix7 = setModelMatrix(nochange_translation, nochange_rotation);

            requestAnimationFrame(render);
            draw2D(Program.ctx);
            // draw(Program, Cubebuffer, modelMatrix, projectionMatrix);
            if (crash == 0) {
                if (mtlDocArray[0] && objDocArray[0]) {
                    getDrawingInfo(Program.gl, objbuffers, objDocArray[0], mtlDocArray[0]);
                    if (objbuffers[0]){
                        Program.gl.bindFramebuffer(Program.gl.FRAMEBUFFER, fbo);               // Change the drawing destination to FBO
                        Program.gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT); // Set view port for FBO
                        Program.gl.clear(Program.gl.COLOR_BUFFER_BIT | Program.gl.DEPTH_BUFFER_BIT);   // Clear FBO    
                        drawShadow(Program, objbuffers[0], modelMatrix5, viewMatrixFromLight, projectionMatrixFromLight);
                        // drawShadow(Program, ballbuffer1, modelMatrix1, viewMatrixFromLight, projectionMatrixFromLight);
                        // drawShadow(Program, ballbuffer2, modelMatrix2, viewMatrixFromLight, projectionMatrixFromLight);
                        // drawShadow(Program, ballbuffer3, modelMatrix3, viewMatrixFromLight, projectionMatrixFromLight);
                        // drawShadow(Program, ballbuffer4, modelMatrix4, viewMatrixFromLight, projectionMatrixFromLight);
                        Program.gl.bindFramebuffer(Program.gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
                        Program.gl.viewport(0, 0, cw, ch);
                        Program.gl.clear(Program.gl.COLOR_BUFFER_BIT | Program.gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer
                        drawMTLTexture(Program, objbuffers[0], modelMatrix5, viewMatrix, projectionMatrix, 4);
                    }
                }
            }
            else {
                drawParticle(Program, particlebuffer, boom_time, modelMatrix6, viewMatrix, projectionMatrix);
                boom_time = boom_time + 0.001;
            }
            if (weather == 0) {
                drawSkybox(Program, skyboxbuffer, now / 20, skybox, viewMatrix, projectionMatrix);
                // drawSkybox(Program, skyboxbuffer,  0, skybox, viewMatrix, projectionMatrix);

                drawTexture(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix, 0);
                drawTexture(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix, 1);
                drawTexture(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix, 2);
                drawTexture(Program, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix, 3);
            }
            if (weather == 1) {
                drawfogSkybox(Program, skyboxbuffer, skybox, viewMatrix, projectionMatrix);
                drawPlane(Program, planebuffer, modelMatrix7, viewMatrix, projectionMatrix, viewMatrixFromLight, projectionMatrixFromLight);
                drawfogTexture(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix, 0);
                drawfogTexture(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix, 1);
                drawfogTexture(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix, 2);
                drawfogTexture(Program, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix, 3);
            }
            nochange_translation[2] += deltaTime * speed;//让飞机每秒都按速度向前
            // translation[2] -= deltaTime * speed;
        }
        requestAnimationFrame(render);
    }

};

function getDrawingInfo(gl, buffers, objDocs, mtlDocs) {

    var positions = new Array(0);
    var indices = new Array(0);
    var normals = new Array(0);
    var textureCoords = new Array(0);
    var diffuse_colors = new Array(0);
    var specular_colors = new Array(0);
    var ambientLights = new Array(0);
    var numIndices = 0;
    for (var i = 0; i < objDocs.objects.length; i++) {
        numIndices += objDocs.objects[i].numIndices;
        //每一个objects[i].numIndices 是它的所有的face的顶点数加起来
    }
    // for(var i = 0; i < objDocs.textureCoords.length; i++)
    //     textureCoords.push(objDocs.textureCoords[i].x, objDocs.textureCoords[i].y);
    var index_indices = 0;
    for (var i = 0; i < objDocs.objects.length; i++) {
        var currentObject = objDocs.objects[i];
        for (var j = 0; j < currentObject.faces.length; j++) {
            var currentFace = currentObject.faces[j];
            var currentMtl;
            for (var k = 0; k < mtlDocs.mtls.length; k++)
                if (mtlDocs.mtls[k].name === currentFace.materialName) {
                    currentMtl = mtlDocs.mtls[k];
                    break;
                }

            for (var k = 0; k < currentFace.vIndices.length; k++) {
                diffuse_colors.push(currentMtl.Kd.r, currentMtl.Kd.g, currentMtl.Kd.b, 1);
                specular_colors.push(currentMtl.Ks.r, currentMtl.Ks.g, currentMtl.Ks.b, 1);
                ambientLights.push(currentMtl.Ka.r, currentMtl.Ka.g, currentMtl.Ka.b, 1);
                indices.push(index_indices % numIndices);
                var vIdx = currentFace.vIndices[k];
                var tIdx = currentFace.tIndices[k];
                var nIdx = currentFace.nIndices[k];
                positions.push(objDocs.vertices[vIdx].x, objDocs.vertices[vIdx].y, objDocs.vertices[vIdx].z);
                if (tIdx >= 0)
                    textureCoords.push(objDocs.textureCoords[tIdx].x, objDocs.textureCoords[tIdx].y);
                else
                    textureCoords.push(0, 0);
                if (nIdx >= 0)
                    normals.push(objDocs.normals[nIdx].x, objDocs.normals[nIdx].y, objDocs.normals[nIdx].z);
                else
                    normals.push(currentFace.normal[0], currentFace.normal[1], currentFace.normal[2]);
                index_indices++;
            }
        }
    }
    temp = initMTLTextBuffers(gl, positions, diffuse_colors, specular_colors, indices, normals, textureCoords, ambientLights);
    buffers.push(temp);
}