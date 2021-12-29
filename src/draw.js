var weather = 1;        // 0代表晴天，1代表雾天

var objbuffers = [];
var objDocArray = [];
var mtlDocArray = [];

var frame = 0;          // 帧数
var fps_time = 0;       // 用于计算帧数的时间
var show_frame;

/**
 * 碰撞检测
 */
var airCrash = 0;           // 飞机坠毁标志
var score = 0;              // 获得分数
var ballSet = [];           // 球体集合: 得分/爆炸
var scoreObjIndex = 0;      // 当前碰撞球体下标
var scoreGet = false;       // 得分爆炸
var planeSize = 0.6;        // 飞机Size
var planeIsRotating = 0;    // 飞机旋转状态
var boom_time = 1000;       // 爆炸用计时器
var prize_time = 1000;      // 得分用计时器
var plane_height = 20.0;
/**
 * 弹窗
 */
function Game_Start() {
    speed = 8;  // 初始速度
    document.getElementById("start").style.display = "none";
}

function Lose() {
    document.getElementById("oops").style.display = "block";
}

function Game_Restart() {

}

var eye = [0, 0, 6];
var sum_deltaY = 0.0;
var sum_theta = 2.0;
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;

var speed = 0;          // speed: 飞机飞行速度
var del = 0.05;

var translation = [0, 0, 0];                // 飞机的平移矩阵
var nochange_translation = [0, 0, -50];     // 物体的平移矩阵
var nochange_scale = [1.0, 1.0, 1.0];
var sinball_scale = [1.0, 1.0, 1.0];
var plane_translation = [0, 0, -50];     // 地板的平移矩阵

var lightColor = [1.0, 1.0, 1.0];
var ambientLight = [0.4, 0.4, 0.4];
var fogdenisty = 0.3;

var light_Scale = 100.0;

var Rotation = function (rad, axis) {
    this.rad = rad;
    this.axis = axis;
}
var rotation = new Rotation(0, [0, 0, 1]);
var nochange_rotation = new Rotation(0, [0, 1, 0]);

var modelxrotation = new Rotation(Math.PI / 2, [1, 0, 0]);
var modelyrotation = new Rotation(Math.PI, [0, 1, 0]);
var modelzrotation = new Rotation(0, [0, 0, 1]);
var modelxrotation_90 = new Rotation(Math.PI * 3 / 2, [1, 0, 0]);
/* 改变天气 */
function change_weather() {
    weather = 1 - weather;
}
/* 飞机坠毁 */
function change_crash() {
    airCrash = 1 - airCrash;
    boom_time = 0;
}
/* 碰撞得分球 */
function change_score() {
    scoreGet = 1 - scoreGet;
    prize_time = 0;
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
        if (index != 3) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
}

//天空盒的绘制部分，其纹理坐标与世界坐标是对应的，所以只需要绑定纹理坐标和index信息
function drawSkybox(Program, buffer, time, skybox, viewMatrix, projectionMatrix, lightDirection, cloud_y) {
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
    Program.gl.uniform1f(
        Program.sky_programInfo.uniformLocations.cloud_y,
        cloud_y);
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
    //为webGL设置从缓冲区抽取颜色数据的属性值，将其放入着色器信息
    {
        const numComponents = 4;//每次取出4个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.color);
        Program.gl.vertexAttribPointer(
            Program.particle_programInfo.attribLocations.color,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.particle_programInfo.attribLocations.color);
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

function drawLine(Program, buffers, modelMatrix, viewMatrix, projectionMatrix) {
    //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
    {
        const numComponents = 3;//每次取出3个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
        Program.gl.vertexAttribPointer(
            Program.line_programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.line_programInfo.attribLocations.vertexPosition);
    }
    //为webGL设置从缓冲区抽取颜色数据的属性值，将其放入着色器信息
    {
        const numComponents = 4;//每次取出4个数值
        const type = Program.gl.FLOAT;//取出数据为浮点数类型
        const normalize = false;
        const stride = 0;
        const offset = 0;
        Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.colors);
        Program.gl.vertexAttribPointer(
            Program.line_programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        Program.gl.enableVertexAttribArray(
            Program.line_programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL which indices to use to index the vertices
    Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    //webGL使用此程序进行绘制
    Program.gl.useProgram(Program.line_programInfo.program);

    // 设置着色器的uniform型变量
    Program.gl.uniformMatrix4fv(
        Program.line_programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    Program.gl.uniformMatrix4fv(
        Program.line_programInfo.uniformLocations.viewMatrix,
        false,
        viewMatrix);
    Program.gl.uniformMatrix4fv(
        Program.line_programInfo.uniformLocations.modelMatrix,
        false,
        modelMatrix);
    {
        const offset = 0;
        const type = Program.gl.UNSIGNED_SHORT;
        const vertexCount = buffers.indices.length;
        //按连续的三角形方式以此按点绘制
        // Program.gl.drawElements(Program.gl.LINE_STRIP, vertexCount, type, offset);
        Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
    }
}
window.onload = function () {

    function draw(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, lightDirection) {
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

    function drawFog(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, lightDirection) {
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
    function drawTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num, lightDirection) {
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
    function drawPlane(Program, buffer, modelMatrix, viewMatrix, projectionMatrix, viewMatrixFromLight, projectionMatrixFromLight, num, lightDirection) {
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
        //法向量
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.normal);
            Program.gl.vertexAttribPointer(
                Program.plane_programInfo.attribLocations.normal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.plane_programInfo.attribLocations.normal);
        }
        //为webGL设置从缓冲区抽取纹理数据的属性值，将其放入着色器信息
        {
            const numComponents = 2;//每次取出2个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.TextCoord);
            Program.gl.vertexAttribPointer(
                Program.plane_programInfo.attribLocations.TextCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.plane_programInfo.attribLocations.TextCoord);
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
        const reverseModelMat = mat4.create();
        mat4.invert(reverseModelMat, modelMatrix);
        mat4.transpose(reverseModelMat, reverseModelMat);
        Program.gl.uniformMatrix4fv(
            Program.plane_programInfo.uniformLocations.reverseModelMatrix,
            false,
            reverseModelMat);
        Program.gl.uniform3fv(
            Program.plane_programInfo.uniformLocations.lightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.plane_programInfo.uniformLocations.lightDirection,
            lightDirection);
        Program.gl.uniform3fv(
            Program.plane_programInfo.uniformLocations.ambient,
            ambientLight);
        Program.gl.uniform1i(
            Program.plane_programInfo.uniformLocations.Sampler,
            num);
        Program.gl.uniform1f(
            Program.plane_programInfo.uniformLocations.plane_height,
            plane_height);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffer.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }
    function drawMTLColor(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, lightDirection) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.MTLColor_programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLColor_programInfo.attribLocations.vertexPosition);
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
                Program.MTLColor_programInfo.attribLocations.normal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLColor_programInfo.attribLocations.normal);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.ambientLight);
            Program.gl.vertexAttribPointer(
                Program.MTLColor_programInfo.attribLocations.ambientLight,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLColor_programInfo.attribLocations.ambientLight);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.diffuse_color);
            Program.gl.vertexAttribPointer(
                Program.MTLColor_programInfo.attribLocations.diffuse_color,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLColor_programInfo.attribLocations.diffuse_color);
        }
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.specular_color);
            Program.gl.vertexAttribPointer(
                Program.MTLColor_programInfo.attribLocations.specular_color,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.MTLColor_programInfo.attribLocations.specular_color);
        }
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.MTLColor_programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.MTLColor_programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.MTLColor_programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.MTLColor_programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        const reverseModelMat = mat4.create();
        mat4.invert(reverseModelMat, modelMatrix);
        mat4.transpose(reverseModelMat, reverseModelMat);
        Program.gl.uniformMatrix4fv(
            Program.MTLColor_programInfo.uniformLocations.reverseModelMatrix,
            false,
            reverseModelMat);
        Program.gl.uniform3fv(
            Program.MTLColor_programInfo.uniformLocations.lightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.MTLColor_programInfo.uniformLocations.lightDirection,
            lightDirection);
        // Program.gl.uniform3fv(
        //     Program.Color_programInfo.uniformLocations.ambient,
        //     ambientLight);
        var eyePosition = vec3.fromValues(eye[0], eye[1], eye[2]);
        Program.gl.uniform3fv(
            Program.MTLColor_programInfo.uniformLocations.eyePosition,
            eyePosition);
        Program.gl.uniform1f(
            Program.MTLColor_programInfo.uniformLocations.roughness,
            0.3);
        Program.gl.uniform1f(
            Program.MTLColor_programInfo.uniformLocations.fresnel,
            0.04);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }
    function drawMTLTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num, lightDirection) {
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

    function drawfogTexture(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, num, lightDirection) {
        if (!ballSet[num].exist) return;
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
        // console.log(modelMatrix)
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
    function setModelMatrix(translation, rotation, scale, modelxrotation, modelyrotation, modelzrotation, center) {
        const modelMatrix = mat4.create();

        mat4.translate(modelMatrix,     // destination matrix
            modelMatrix,     // matrix to translate
            translation);  // amount to translate

        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            rotation.rad,     // amount to rotate in radians
            rotation.axis);       // axis to rotate around (Z)

        if (center) {
            //console.log(center);
            var center0 = [];
            center0[0] = -center[0];
            center0[1] = -center[1];
            center0[2] = -center[2];
            mat4.translate(modelMatrix,     // destination matrix
                modelMatrix,     // matrix to translate
                center);  // amount to translate
            mat4.scale(modelMatrix,  // destination matrix
                modelMatrix,  // matrix to rotate
                scale);       // axis to rotate around (Z)
            mat4.translate(modelMatrix,     // destination matrix
                modelMatrix,     // matrix to translate
                center0);  // amount to translate                
        }

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
        //console.log(modelMatrix)    
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
    function setViewMatrixFromLight(LIGHT_X, LIGHT_Y, LIGHT_Z) {
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
        constructor(id, center, dx, dy, dz, type) {
            this.id = id;
            this.center = center;
            this.dx = dx;       // dx, dy, dz: 球体大小
            this.dy = dy;
            this.dz = dz;
            this.type = type;   // type = 0, 爆炸球; type = 1, 得分球
            this.exist = true;
        }
        check(px, py, pz) {     // px, py, pz: 飞机的大小
            return (Math.abs(this.center[0] + nochange_translation[0] - translation[0]) < px + this.dx) &&
                (Math.abs(this.center[1] + nochange_translation[1] - translation[1]) < py + this.dy) &&
                (Math.abs(this.center[2] + nochange_translation[2] - translation[2]) < pz + this.dz);
        }
    }

    // 碰撞检测: crash - 坠毁标志
    function checkCollision() {
        if (airCrash) return;
        // 遍历所有obj
        var px = Math.abs(2.5 * planeSize * Math.cos(rotation.rad));
        var py = Math.abs(planeSize * Math.sin(rotation.rad));
        for (let i = 0; i < ballSet.length; i++) {
            // 碰撞
            if (ballSet[i].check(px, py, 1.5 * planeSize) && ballSet[i].exist) {
                // console.log("[Collision] " + i);
                if (ballSet[i].type == 1) {  // 得分球
                    change_score();
                    ++score;
                    scoreObjIndex = i;
                    ballSet[i].exist = false;
                    break;
                }
                else if (ballSet[i].type == 0) {  // 爆炸球
                    change_score();
                    scoreObjIndex = i;
                    ballSet[i].exist = false;
                    change_crash();
                    boom_time = 0.001;
                    rotation = new Rotation(0, [0, 0, 1]);
                    modelxrotation = new Rotation(Math.PI / 2, [1, 0, 0]);
                    speed = 1.0;
                    break;
                }
            }
        }
    }
    function setLightdirection(deltaTime) {
        sum_theta = sum_theta + deltaTime * 0.3;
        var temp1 = Math.cos(sum_theta / 10.0);
        var temp2 = Math.sin(sum_theta / 10.0);
        return [Math.SQRT2 * temp1, Math.SQRT2 * temp2, 0.0];
    }
    show();

    function show() {
        const Program = initProgram();
        //天空盒对应的纹理，为http://www.cad.zju.edu.cn/home/hwu/cg.html 中提供的环境纹理
        var skybox_urls = [
            "../texture/pavilion_skybox/right.jpg",
            "../texture/pavilion_skybox/left.jpg",
            "../texture/pavilion_skybox/up.jpg",
            "../texture/pavilion_skybox/down.jpg",
            "../texture/pavilion_skybox/back.jpg",
            "../texture/pavilion_skybox/front.jpg",
        ];
        var skybox = loadSkybox(Program.gl, skybox_urls);
        var center = [0, 0, 0];
        var size = [3, 4, 5];
        var size_plane = [2000.0, 0.0, 3000.0];   // 地面Size
        var color = [1, 0, 0, 1];

        /**
         * 得分球设置
         */
        var numOfBalls = 50;
        // center
        var ballCenter = [];
        var ballHeight = 5.0
        ballCenter[0] = [0, 0, 100];
        ballCenter[1] = [0, 0, 110];
        for (var i = 2; i < numOfBalls; ++i) {
            var rand = Math.random() * 10 - 5;
            ballCenter[i] = [rand * 2, ballHeight + rand, -(i + 1) * 15];  // 随机初始化球坐标
        }
        // radius
        var ballRadius = 0.8;
        // colors
        var ballColor = [];
        ballColor[0] = [220 / 255.0, 47 / 255.0, 31 / 255.0, 1.0];      // Red
        ballColor[1] = [80 / 255.0, 24 / 255.0, 21 / 255.0, 1.0];       // Black
        ballColor[2] = [60 / 255.0, 107 / 255.0, 176 / 255.0, 1.0];     // Blue
        ballColor[3] = [239 / 255.0, 169 / 255.0, 13 / 255.0, 1.0];     // Yellow
        /* 碰撞球: Texture, ballSet, buffers */
        var ballTextPath = [];
        ballTextPath[0] = '../res/boom.jpg';        // 爆炸球 - 0
        ballTextPath[1] = '../res/score.jfif';      // 得分球 - 1
        initTextures(Program, Program.gl, ballTextPath[0], 0);
        initTextures(Program, Program.gl, ballTextPath[1], 1);
        // 飞机纹理 - 2
        var text_plane_path = '../texture/plane.jpg';
        initTextures(Program, Program.gl, text_plane_path, 2);
        // 地面纹理 - 3
        initTextures(Program, Program.gl, "../res/ground.jpg", 3);

        const ballBuffer = [];
        var probOfCrashBall = 0.3;                  // 爆炸球的比例
        for (var i = 0; i < numOfBalls; ++i) {
            var rand = Math.random(); // Math.random(): 返回[0,1)的数
            if (rand < probOfCrashBall) {    // 爆炸球: type = 0
                // initTextures(Program, Program.gl, ballTextPath[0], i);
                ballSet.push(new crashObj(i, ballCenter[i], ballRadius, ballRadius, ballRadius, 0));
            }
            else {                          // 得分球: type = 1
                // initTextures(Program, Program.gl, ballTextPath[1], i);
                ballSet.push(new crashObj(i, ballCenter[i], ballRadius, ballRadius, ballRadius, 1));
            }
            ballBuffer[i] = initTextureBall(
                Program, ballCenter[i], ballRadius, ballColor[i % 4]
            );
        }

        /**
         * 飞机参数
         */
        var start1 = [-1.55, -0.05, -0.05];                   // 飞机尾翼
        var start2 = [1.55, -0.05, -0.05];
        var end1 = [-2.0, 10.0, 0.0];
        var end2 = [2.0, 10.0, 0.0];
        var size_line = [0.03, 0.01];


        /**
         * 圆柱、圆锥参数
         */
        var black = [0.0, 0.0, 0.0, 1.0];
        var gold = [205 / 255.0, 127 / 255.0, 50 / 255.0, 1.0];
        var center_cone = [0.0, 15.0, -20.0];
        var center_cylinder = [-0.0, 15.0, -18.0];
        var radius_cone = 2.0;
        var height_cone = 2.0;
        var radius_cylinder = 2.0;
        var height_cylinder = 2.0;
        const conebuffer = initOneCone(Program, center_cylinder, radius_cylinder, height_cylinder, gold);
        const cylinderbuffer = initOneCylinder(Program, center_cone, radius_cone, height_cone, gold);


        // 球体爆炸粒子buffer
        const prizeparticlebuffer = initParticle(Program, [0, 0, 0], gold, 1000, 0.8, 0.5, 0.05);
        const boomparticlebuffer = initParticle(Program, center, black, 5000, 1.6, 0.5, 0.3);

        // 地面
        var centerPlane = [0.0, -20.0, 0.0];

        // 天空盒
        const skyboxbuffer = initSkybox(Program);

        // 飞机模型
        LoadObjFile(Program.gl, '../obj/VLJ19OBJ.obj', objDocArray, mtlDocArray, planeSize, false);

        // LoadObjFile(Program.gl, '../obj/city/file.obj', objDocArray, mtlDocArray, 10, false);

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

        var then = 0;
        // Draw the scene repeatedly
        function render(now) {

            now *= 0.001;  // convert to seconds
            const deltaTime = now - then;
            then = now;

            // console.log(nochange_translation);
            if (nochange_translation[2] > numOfBalls * 15 + 100) {
                document.getElementById("win").style.display = "block";
                speed = 3;
            }
            //console.log(sinball_scale);

            const planebuffer = initPlane(Program, centerPlane, size_plane);
            // console.log(sinball_scale);
            sinball_scale[0] = 1.5 + 0.3 * Math.sin(now);
            sinball_scale[1] = 1.5 + 0.3 * Math.sin(now);
            sinball_scale[2] = 1.5 + 0.3 * Math.sin(now);
            // console.log(sinball_scale);
            // 飞机方向纠正
            if (!planeIsRotating) {
                if (rotation.rad > 0.03)
                    rotation.rad -= del / 3;
                if (rotation.rad < -0.03)
                    rotation.rad += del / 3;

                if (modelxrotation.rad > 1.8)
                    modelxrotation.rad -= del / 3;
                if (modelxrotation.rad < 1.6)
                    modelxrotation.rad += del / 3;
            }

            const linebuffer1 = initLineCube(Program, start1, end1, size_line);
            const linebuffer2 = initLineCube(Program, start2, end2, size_line);
            checkCollision();   // 碰撞检测

            var lightDirection = setLightdirection(deltaTime);
            var LIGHT_X = -lightDirection[0] * light_Scale, LIGHT_Y = -lightDirection[1] * light_Scale, LIGHT_Z = -lightDirection[2] * light_Scale;

            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();
            const projectionMatrixFromLight = setProjectionMatrixFromLight(Program.gl);
            const viewMatrixFromLight = setViewMatrixFromLight(LIGHT_X, LIGHT_Y, LIGHT_Z);

            // const modelMatrix = setModelMatrix(translation, rotation);
            const ball_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, nochange_scale);
            const aircraft_modelMatrix = setModelMatrix(translation, rotation, nochange_scale, modelxrotation, modelyrotation, modelzrotation);
            const boom_modelMatrix = setModelMatrix(translation, rotation, nochange_scale);
            const prize_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, nochange_scale);
            const plane_modelMatrix = setModelMatrix(plane_translation, nochange_rotation, nochange_scale);

            const line_modelMatrix1 = setModelMatrix(translation, rotation, nochange_scale);
            const line_modelMatrix2 = setModelMatrix(translation, rotation, nochange_scale);
            const cone_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, nochange_scale, modelxrotation_90);
            const cylinder_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, nochange_scale, modelxrotation_90);

            requestAnimationFrame(render);
            draw2D(Program.ctx);
            // draw(Program, Cubebuffer, modelMatrix, projectionMatrix);
            if (airCrash == 0) {
                if (mtlDocArray[0] && objDocArray[0]) {
                    getDrawingInfo(Program.gl, objbuffers, objDocArray[0], mtlDocArray[0]);
                    // getColorDrawingInfo(Program.gl, objbuffers, objDocArray[0], mtlDocArray[0]);
                    if (objbuffers[0]) {
                        Program.gl.bindFramebuffer(Program.gl.FRAMEBUFFER, fbo);                        // Change the drawing destination to FBO
                        Program.gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT);                  // Set view port for FBO
                        Program.gl.clear(Program.gl.COLOR_BUFFER_BIT | Program.gl.DEPTH_BUFFER_BIT);    // Clear FBO  

                        drawShadow(Program, objbuffers[0], aircraft_modelMatrix, viewMatrixFromLight, projectionMatrixFromLight);

                        // 球体阴影
                        for (var i = 0; i < numOfBalls; ++i) {
                            if (ballSet[i].exist)
                                if (i % 7) {
                                    drawShadow(Program, ballBuffer[i], ball_modelMatrix, viewMatrixFromLight, projectionMatrixFromLight);

                                }
                                else {
                                    var sinball_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, sinball_scale, null, null, null, ballCenter[i]);
                                    drawShadow(Program, ballBuffer[i], sinball_modelMatrix, viewMatrixFromLight, projectionMatrixFromLight);
                                }
                        }
                        // 圆柱和圆锥 - 阴影
                        drawShadow(Program, conebuffer, cone_modelMatrix, viewMatrixFromLight, projectionMatrixFromLight);
                        drawShadow(Program, cylinderbuffer, cylinder_modelMatrix, viewMatrixFromLight, projectionMatrixFromLight);

                        Program.gl.bindFramebuffer(Program.gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
                        Program.gl.viewport(0, 0, cw, ch);
                        Program.gl.clear(Program.gl.COLOR_BUFFER_BIT | Program.gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

                        // 飞机纹理
                        drawMTLTexture(Program, objbuffers[0], aircraft_modelMatrix, viewMatrix, projectionMatrix, 2, lightDirection);

                        drawLine(Program, linebuffer1, aircraft_modelMatrix, viewMatrix, projectionMatrix);
                        drawLine(Program, linebuffer2, aircraft_modelMatrix, viewMatrix, projectionMatrix);
                    }
                }
                // 得分: 得分球爆炸
                if (scoreGet) {
                    mat4.translate(prize_modelMatrix, prize_modelMatrix, ballSet[scoreObjIndex].center);    // 平移爆炸例子
                    prize_time = prize_time + 0.001;
                    drawParticle(Program, prizeparticlebuffer, prize_time, prize_modelMatrix, viewMatrix, projectionMatrix);
                }
                // 爆炸粒子结束: scoreGet置0
                if (prize_time > 0.03) scoreGet = 0;
            }
            else {  // 飞机爆炸
                drawParticle(Program, boomparticlebuffer, boom_time, boom_modelMatrix, viewMatrix, projectionMatrix);
                boom_time = boom_time + 0.001;
                // 爆炸粒子结束: 弹窗
                if (boom_time > 0.2) {
                    Lose();
                }
            }
            /* 天气控制 */
            if (weather == 0) {     // 0 - 晴天
                drawSkybox(Program, skyboxbuffer, now / 50, skybox, viewMatrix, projectionMatrix, lightDirection, nochange_translation[1] / 10);
                for (var i = 0; i < numOfBalls; ++i) {
                    if (ballSet[i].exist) {
                        if (i % 7)
                            drawTexture(Program, ballBuffer[i], ball_modelMatrix, viewMatrix, projectionMatrix, ballSet[i].type, lightDirection);
                        else {
                            var sinball_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, sinball_scale, null, null, null, ballCenter[i]);
                            drawTexture(Program, ballBuffer[i], sinball_modelMatrix, viewMatrix, projectionMatrix, ballSet[i].type, lightDirection);
                        }

                    }
                }

            }
            if (weather == 1) {     // 1 - 雾天
                drawfogSkybox(Program, skyboxbuffer, skybox, viewMatrix, projectionMatrix);
                if (plane_height <= 100) {
                    drawPlane(Program, planebuffer, plane_modelMatrix, viewMatrix, projectionMatrix, viewMatrixFromLight, projectionMatrixFromLight, 3, lightDirection);
                }
                // 球
                for (var i = 0; i < numOfBalls; ++i) {
                    if (ballSet[i].exist) {
                        if (i % 7)
                            drawfogTexture(Program, ballBuffer[i], ball_modelMatrix, viewMatrix, projectionMatrix, ballSet[i].type, lightDirection);
                        else {
                            var sinball_modelMatrix = setModelMatrix(nochange_translation, nochange_rotation, sinball_scale, null, null, null, ballCenter[i]);
                            drawfogTexture(Program, ballBuffer[i], sinball_modelMatrix, viewMatrix, projectionMatrix, ballSet[i].type, lightDirection);

                        }

                    }
                }

            }
            // 地面
            // drawTexture(Program, ballBuffer[0], plane_modelMatrix, viewMatrix, projectionMatrix, 2, lightDirection);
            // drawfogTexture(Program, planebuffer, ball_modelMatrix, viewMatrix, projectionMatrix, ballSet[i].type, lightDirection);


            draw(Program, conebuffer, cone_modelMatrix, viewMatrix, projectionMatrix, lightDirection);
            draw(Program, cylinderbuffer, cylinder_modelMatrix, viewMatrix, projectionMatrix, lightDirection);
            nochange_translation[2] += deltaTime * speed;   // 让飞机每秒都按速度向前
            plane_translation[2] += deltaTime * speed;   // 让飞机每秒都按速度向前
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

function getColorDrawingInfo(gl, buffers, objDocs, mtlDocs) {

    var positions = new Array(0);
    var indices = new Array(0);
    var normals = new Array(0);
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
                if (currentMtl.Kd)
                    diffuse_colors.push(currentMtl.Kd.r, currentMtl.Kd.g, currentMtl.Kd.b, 1);
                if (currentMtl.Ks)
                    specular_colors.push(currentMtl.Ks.r, currentMtl.Ks.g, currentMtl.Ks.b, 1);
                if (currentMtl.Ka)
                    ambientLights.push(currentMtl.Ka.r, currentMtl.Ka.g, currentMtl.Ka.b, 1);
                indices.push(index_indices % numIndices);
                var vIdx = currentFace.vIndices[k];
                var nIdx = currentFace.nIndices[k];
                positions.push(objDocs.vertices[vIdx].x, objDocs.vertices[vIdx].y, objDocs.vertices[vIdx].z);

                if (nIdx >= 0)
                    normals.push(objDocs.normals[nIdx].x, objDocs.normals[nIdx].y, objDocs.normals[nIdx].z);
                else
                    normals.push(currentFace.normal[0], currentFace.normal[1], currentFace.normal[2]);
                index_indices++;
            }
        }
    }
    temp = initMTLColorBuffers(gl, positions, diffuse_colors, specular_colors, indices, normals, ambientLights);
    buffers.push(temp);
}