function loadSkybox(gl, urls) {
    const texture = gl.createTexture(); //1.创建一个GL纹理对象
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture); //2.新创建的纹理对象绑定到 gl.TEXTURE_CUBE 来让它成为当前操作纹理。

    // 初始化纹理
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // 深蓝色

    //天空盒六面信息
    const faceInfos = [
        //右
        {
          target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
          url: urls[0],
        },
        //左
        {
          target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
          url: urls[1],
        },
        //上
        {
          target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
          url: urls[2],
        },
        //下
        {
          target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
          url: urls[3],
        },
        //后
        {
          target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
          url: urls[4],
        },
        //前
        {
          target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
          url: urls[5],
        },
      ];
      faceInfos.forEach((faceInfo) => {
        const {target, url} = faceInfo;
  
        // 初始化为深蓝色
        gl.texImage2D(target, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
    
        // 异步加载图片
        const image = new Image();
        image.src = url;
        image.onload = function() {
          //纹理加载完毕后将其绑定至对应cube map的面
          gl.texImage2D(target, level, internalFormat, srcFormat, srcType, image);
          if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
          }
          else{
              gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
              gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
              gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          }
        };
      });
    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}