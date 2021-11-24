var objbuffers = [];
var eye = [0, 0, 6];
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;
var viewMatrix;


window.onload = function () {
    //var objDocs = [];      // The information of OBJ file
    //var objInfos = [];
    show();
    viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eye, target, up);

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

    function draw(Program, buffers, modelMatrix, projectionMatrix) {
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

    function setProjectionMatrix(gl) {
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar);
        return projectionMatrix;
    }

    function show() {
        const Program = initProgram();
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


        LoadObjFile(Program.gl, '../obj/cube.obj', objbuffers, 3, false, 0);

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
            // const modelMatrix = setModelMatrix(translation, rotation);
            const modelMatrix1 = setModelMatrix([0, 0, 0], rotation);
            const modelMatrix2 = setModelMatrix([0, 0, 0], rotation);
            const modelMatrix3 = setModelMatrix([0, 0, 0], rotation);
            const modelMatrix4 = setModelMatrix([0, 0, 0], rotation);
            const modelMatrix5 = setModelMatrix(translation, rotation);
            const projectionMatrix = setProjectionMatrix(Program.gl);
            mat4.translate(viewMatrix,     // 使观察视角始终与飞机相同
                viewMatrix,
                [0, 0, deltaTime * speed]);
            requestAnimationFrame(render);
            // draw(Program, Cubebuffer, modelMatrix, projectionMatrix);
            draw(Program, ballbuffer1, modelMatrix1, projectionMatrix);
            draw(Program, ballbuffer2, modelMatrix2, projectionMatrix);
            draw(Program, ballbuffer3, modelMatrix3, projectionMatrix);
            draw(Program, ballbuffer4, modelMatrix4, projectionMatrix);
            if (objbuffers[0])
                draw(Program, objbuffers[0], modelMatrix5, projectionMatrix);
            translation[2] -= deltaTime * speed;//让飞机每秒都按速度向前
        }
        requestAnimationFrame(render);
    }

};