var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
function initProgram() {
    //准备webGL的上下文：获取canvas的引用并保存在canvas变量里，并获取webGLRenderingContest并赋值给gl
    //gl会用来引用webGL上下文
    const canvas = document.querySelector('#glcanvas');
    const hud = document.querySelector('#hud');
    const gl = canvas.getContext('webgl');
    const ctx = hud.getContext('2d');
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    if (!gl || !ctx) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }
    hud.onmousedown = handleMouseDown;
    hud.onmouseup = handleMouseUp;
    hud.onmousemove = handleMouseMove;
    hud.onmouseout = handleMouseOut;
    hud.addEventListener('wheel',onMouseWheel,false);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    const shadow_vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置

    void main() {
      gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
    }
  `;
    const shadow_fsSource = `
    precision mediump float;

    void main() {
        const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
        const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
        vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);
        rgbaDepth -= rgbaDepth.gbaa * bitMask;
        gl_FragColor = rgbaDepth;
        // gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 0.0);
    }
  `;
    const sky_vsSource = `
    attribute vec4 aTextureCoord;   //纹理坐标

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置

    varying highp vec3 vTextureCoord;
    varying vec4 vPosition;

    void main() {
      vec4 pos = uProjectionMatrix * uViewMatrix * aTextureCoord;  //点坐标位置
      gl_Position = pos.xyww; //使其深度始终是w/w = 1,欺骗深度检测使天空盒在深处
      vTextureCoord = aTextureCoord.xyz;
      vPosition = aTextureCoord;
    }
  `;
    //定义天空盒片段着色器
    const sky_fsSource = `
    precision mediump float;

    varying highp vec3 vTextureCoord;
    varying vec4 vPosition;

    uniform samplerCube uSampler;
    uniform vec3 uEyePosition;
    uniform vec3 uTargetPosition;
    uniform vec3 uUp;
    uniform vec3 uLightDirection;
    uniform vec2 uResolution;
    uniform float uTime;

    vec3 random_worly(vec3 p) {
        p = vec3(
                dot(p,vec3(127.1,311.7,69.5)),
                dot(p,vec3(269.5,183.3,132.7)), 
                dot(p,vec3(247.3,108.5,96.5)) 
                );
        return fract(sin(p)*43758.5453123);
    }

    float noise_worley(vec3 st) {
        // Tile the space
        vec3 i_st = floor(st);
        vec3 f_st = fract(st);
        float min_dist = 1.;
        for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
                for (int k = -1; k <= 1; k++) {
                    vec3 neighbor = vec3(float(i),float(j),float(k));
                    vec3 point = random_worly(i_st + neighbor);
                    float d = length(point + neighbor - f_st);
                    min_dist = min(min_dist,d);
                }
            }
        }
        return pow(min_dist,2.);
    }

    float noise_worley_fbm_abs(vec3 p)
    {
        float f = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
            f += a * abs(noise_worley(p)-.5);
            p = 2. * p;
            a /= 2.;
        }
    
        return f;
    }

    vec3 random_perlin(vec3 p) {
        p = vec3(
                dot(p,vec3(127.1,311.7,69.5)),
                dot(p,vec3(269.5,183.3,132.7)), 
                dot(p,vec3(247.3,108.5,96.5)) 
                );
        return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }
    float noise_perlin(vec3 p) {
        vec3 i = floor(p);
        vec3 s = fract(p);

        // 3D网格有8个顶点
        float a = dot(random_perlin(i),s);
        float b = dot(random_perlin(i + vec3(1, 0, 0)),s - vec3(1, 0, 0));
        float c = dot(random_perlin(i + vec3(0, 1, 0)),s - vec3(0, 1, 0));
        float d = dot(random_perlin(i + vec3(0, 0, 1)),s - vec3(0, 0, 1));
        float e = dot(random_perlin(i + vec3(1, 1, 0)),s - vec3(1, 1, 0));
        float f = dot(random_perlin(i + vec3(1, 0, 1)),s - vec3(1, 0, 1));
        float g = dot(random_perlin(i + vec3(0, 1, 1)),s - vec3(0, 1, 1));
        float h = dot(random_perlin(i + vec3(1, 1, 1)),s - vec3(1, 1, 1));

        // Smooth Interpolation
        vec3 u = smoothstep(0.,1.,s);

        // 根据八个顶点进行插值
        return mix(mix(mix( a, b, u.x),
                    mix( c, e, u.x), u.y),
                mix(mix( d, f, u.x),
                    mix( g, h, u.x), u.y), u.z);
    }
    float noise_perlin_fbm(vec3 p)
    {
        float f = 0.0;
        p = 2. * p;
        float a = 2.;
        for (int i = 0; i < 5; i++) {
            f += a * noise_perlin(p);
            p = 2.0 * p;
            a /= 2.;
        }
        //f = sin(f + p.x/1000.0);
    
        return f;
    }
    float map(in vec3 p, float oct){
        //使云朵向前下方移动
        vec3 q = p - vec3(0.0,0.1,1.0) * uTime;
        float g1 = 0.5+0.5*noise_worley( q*0.3 );
        //q系数越大，起伏越大
        float g2 = 0.5+0.5*noise_worley( q*0.3 );
        
        float f1, f2;
        f1 = noise_perlin_fbm(q);
        f2 = noise_worley_fbm_abs(q * oct);
        
        //f1 * a - 0.75, a越大，起伏细节越多
        f1 = mix( f1*0.3-0.75, f1, g1*g1 ) + 0.3;
        //f2 * a - 0.75, a越大，边缘细节越多
        f2 = mix( f2*0.1-0.75, f2, g2*g2 ) + 0.2;
        
        //float f = 1. - f1 + f2;
        float f = mix(f1, f2, 0.9);
        return 1.5*f - 0.5 - p.y;
    }
    vec3 sundir = normalize(uLightDirection);
    const int kDiv = 1; // make bigger for higher quality
    
    vec4 raymarch( in vec3 ro, in vec3 rd, in vec3 bgcol){
        // 视角范围
        const float y_bottom = -6.0;
        const float y_top =  6.0;
        //rd本身被归一化，分量小于1，用除法，使得步进范围大
        float t_bottom = 5. * (y_bottom-ro.y)/rd.y;
        float t_top = 5. * (y_top-ro.y)/rd.y;
    
        // 确认需要ray march的区域
        float tmin, tmax;

            tmin = 0.0;
            tmax = 50.0;
            // t_bottom为正表示视线朝下
            if(t_bottom > 0.0)
                tmax = min(tmax, t_bottom);
            // t_top为正表示视线朝上
            if(t_top > 0.0)
                tmax = min(tmax, t_top);

        
        float t = tmin;
        
        // raymarch loop
        vec4 sum = vec4(0.0);
        for( int i=0; i<50*kDiv; i++ )
        {
           // step size
           float dt = max(0.3,0.1*t/float(kDiv));
    
           float oct = 1.;

           //cloud
           vec3 pos = ro + t*rd;
           if(pos. y > y_top)
                break;
            else{
                float den = map(pos,oct);
                if( den > 0.01 ){ // if inside
                    // do lighting
                    float dif = clamp((den - map(pos+0.3 * sundir, oct)) / 0.3, 0.0, 1.0 );
                    vec3  lin = vec3(0.65, 0.65, 0.75) * 1.1 + 0.8 * vec3(1.0, 0.6, 0.3) * dif;
                    vec4  col = vec4(mix(vec3(1.0,0.95,0.8), vec3(0.25,0.3,0.35), den), den);
                    col.xyz *= lin;
                    // fog
                    col.xyz = mix(col.xyz, bgcol, 1.0 - exp2(-0.003 * t * t));
                    // composite front to back
                    col.w    = min(col.w * 8.0 * dt,1.0);
                    col.rgb *= col.a;
                    sum += col*(1.0-sum.a);
                }
     
            }
           // advance ray
           t += dt;
           // until far clip or full opacity
           if( t>tmax || sum.a>0.99 ) break;
        }
    
        return clamp(sum, 0.0, 1.0);
    }
    
    vec4 render(in vec3 ro, in vec3 rd){
        float sun = clamp( dot(sundir,rd), 0.0, 1.0 );
    
        // background sky
        vec3 col = vec3(0.76,0.75,0.86);
        col -= 0.6*vec3(0.90,0.75,0.95)*rd.y;
        col += 0.2*vec3(1.00,0.60,0.10)*pow( sun, 8.0 );
    
    
        // clouds    
        vec4 res = raymarch(ro, rd, col);
        col = col*(1.0-res.w) + res.xyz;
        
        // sun glare    
        col += 0.2*vec3(1.0,0.4,0.2)*pow(sun, 3.0);
    
        // tonemap
        col = smoothstep(0.15,1.1,col);
     
        return vec4( col, 1.0 );
    }

    void main() {

      vec3 cu = normalize(uTargetPosition - uEyePosition);
      vec3 cv = normalize(uUp);
      vec3 cw = normalize(cross(cu, cv));
      mat3 ca = mat3(cu, cv, cw);
      // ray
      vec3 rd = ca * normalize(vTextureCoord);
    //   if(vTextureCoord.y > -3.0)
    //     gl_FragColor = textureCube(uSampler, normalize(vTextureCoord));
    //   else
      gl_FragColor = render(uEyePosition, normalize(vTextureCoord));

      // gl_FragColor = textureCube(uSampler, normalize(vTextureCoord));
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
    attribute vec4 aAmbientLight; //环境光
    attribute vec4 adiffuse_Color; //材质颜色
    attribute vec4 aspecular_Color; //材质颜色

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uReverseModelMatrix; //模型矩阵的逆转置

    varying vec4 vAmbientLight; //环境光
    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;
    varying vec4 vdiffuse_Color;
    varying vec4 vspecular_Color;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
        //法向量进行归一化
        v_Normal = normalize(vec3(uReverseModelMatrix * aNormal));
        //变化后的坐标 -> 世界坐标
        v_Position = uModelMatrix * aVertexPosition;
        v_TextCoord = aTextCoord;
        vAmbientLight = aAmbientLight;
        vdiffuse_Color = adiffuse_Color;
        vspecular_Color = aspecular_Color;
    }
  `;
    //定义纹理片段着色器
    const Texture_fsSource = `
    precision mediump float;
    uniform sampler2D uSampler;
    uniform vec3 uLightColor; //光颜色强度
    uniform vec3 uLightDirection; //光线方向
    uniform vec3 uEyePosition; //视点位置
    uniform float uRoughness, uFresnel;
    
    varying vec4 vdiffuse_Color;
    varying vec4 vspecular_Color;
    varying vec4 vAmbientLight; //环境光
    varying vec3 v_Normal;
    varying vec4 v_Position;
    varying vec2 v_TextCoord;
    
    float cookTorrance(vec3 viewDirection, 
        vec3 lightDirection,
        vec3 vNomral,
        float roughness,
        float fresnel){
          float VdotN = max(dot(viewDirection, vNomral), 0.0);
          float LdotN = max(dot(lightDirection, vNomral), 0.000001);
          vec3 h = normalize(viewDirection + lightDirection);

          //Geometric term, Gb = 2(nh)(nv)/vh, Gc = 2(nh)(nl)/lh, G = min(1, Gb, Gc)
          float NdotH = max(dot(h, vNomral), 0.0);
          float VdotH = max(dot(h, viewDirection), 0.0);
          float LdotH = max(dot(h, lightDirection), 0.0);
          float G = min(1.0, min(2.0 * NdotH * VdotN / VdotH, 2.0 * NdotH * LdotN / LdotH));

          //Distribution term
          float D = exp((NdotH * NdotH - 1.0) / (roughness * roughness * NdotH * NdotH)) / (3.14159265 * roughness * roughness * NdotH * NdotH * NdotH * NdotH);

          //Fresnel term
          float F = pow(1.0 - VdotN, fresnel);

          return max(G * F * D / max(3.14159265 * VdotN * LdotN, 0.000001), 0.0);
    }

    void main() {
        //纹理作为颜色传入
        vec4 v_Color = texture2D(uSampler,v_TextCoord);
        //视线方向并归一化
        vec3 viewDirection = normalize(uEyePosition - vec3(v_Position));
        vec3 lightDirection = normalize(uLightDirection);

        vec3 specular = vec3(vspecular_Color) * v_Color.rgb * cookTorrance(viewDirection, 
            lightDirection,
            v_Normal,
            uRoughness,
            uFresnel
            );
        //计算cos入射角 当角度大于90 说明光照在背面 赋值为0
        float nDotLight = max(dot(lightDirection, v_Normal), 0.0);
        //计算漫反射光颜色
        vec3 diffuse = vec3(vdiffuse_Color) * v_Color.rgb * nDotLight;
        // 环境反射光颜色
        vec3 ambient = vec3(vAmbientLight) * v_Color.rgb;
        vec3 light = mix(diffuse, specular, 0.6);
        gl_FragColor = vec4(light + ambient, v_Color.a);
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
    const particle_vsSource = `
    precision mediump float;

    attribute vec3 astart;
    attribute vec3 aend;
    attribute float alifetime;

    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform float utime;

    varying float outlifetime;
    varying float tt;
    void main() {
        vec4 pos;
        tt=alifetime-utime;
        pos.xyz=astart+(tt*(aend-astart));
        pos.w=1.0;
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * pos;  //点坐标位置
        gl_PointSize = 5.0;
        outlifetime = 1.0-tt;
        outlifetime = clamp(outlifetime,0.0,1.0);
      }
    `;
    const particle_fsSource = `
    precision mediump float;
    varying float outlifetime;
    varying float tt;

    void main(){
        if(tt<0.0){
            discard;
        }
        else{
            float d = distance(gl_PointCoord, vec2(0.5, 0.5));
            if(d < 0.5) {// Radius is 0.5
                gl_FragColor.xyz = vec3(0.0, 0.0, 0.0);
                gl_FragColor.w = outlifetime;
            }
            else discard;
        }
    }
    `;
    const plane_vsSource = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;

    uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
    uniform mat4 uProjectionMatrixFromLight;//光源角度的投影矩阵
    uniform mat4 uViewMatrixFromLight;//光源角度的视角矩阵
    uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
    uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置

    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;
    void main() {
        gl_Position =  uProjectionMatrix * uViewMatrix * uModelMatrix * a_Position; 
        v_PositionFromLight =uProjectionMatrixFromLight * uViewMatrixFromLight * uModelMatrix * a_Position;
        v_Color = a_Color;
    }
    `;

    const plane_fsSource = `
    precision mediump float;

    uniform sampler2D uShadowMap;

    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;

    float unpackDepth(const in vec4 rgbaDepth) {
        const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0 * 256.0 * 256.0));
        float depth = dot(rgbaDepth, bitShift);
        return depth;
    }

    void main() {
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(uShadowMap, shadowCoord.xy);
        float depth = unpackDepth(rgbaDepth);
        // float depth = rgbaDepth.r;
        float visibility =(shadowCoord.z > depth + 0.0015)? 0.7:1.0;
        gl_FragColor = vec4(v_Color.rgb * visibility, v_Color.a);
        
    }
    `;
    //初始化着色器程序
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const fog_shaderProgram = initShaderProgram(gl, fog_vsSource, fog_fsSource);
    const sky_shaderProgram = initShaderProgram(gl, sky_vsSource, sky_fsSource);
    const fogsky_shaderProgram = initShaderProgram(gl, fog_sky_vsSource, fog_sky_fsSource);
    const Texture_shaderProgram = initShaderProgram(gl, Texture_vsSource, Texture_fsSource);
    const fog_Texture_shaderProgram = initShaderProgram(gl, fog_Texture_vsSource, fog_Texture_fsSource);
    const particle_shaderProgram = initShaderProgram(gl, particle_vsSource, particle_fsSource);
    const shadow_shaderProgram = initShaderProgram(gl, shadow_vsSource, shadow_fsSource);
    const plane_shaderProgram = initShaderProgram(gl, plane_vsSource, plane_fsSource);

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
            eyePosition: gl.getUniformLocation(sky_shaderProgram, 'uEyePosition'),
            targetPosition: gl.getUniformLocation(sky_shaderProgram, 'uTargetPosition'),
            up: gl.getUniformLocation(sky_shaderProgram, 'uUp'),
            lightDirection: gl.getUniformLocation(sky_shaderProgram, 'uLightDirection'),
            uResolution: gl.getUniformLocation(sky_shaderProgram, 'uResolution'),
            time: gl.getUniformLocation(sky_shaderProgram, 'uTime'),
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
            ambientLight: gl.getAttribLocation(Texture_shaderProgram, 'aAmbientLight'),
            diffuse_color: gl.getAttribLocation(Texture_shaderProgram, 'adiffuse_Color'),
            specular_color: gl.getAttribLocation(Texture_shaderProgram, 'aspecular_Color'),
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
            eyePosition: gl.getUniformLocation(Texture_shaderProgram, 'uEyePosition'),
            roughness: gl.getUniformLocation(Texture_shaderProgram, 'uRoughness'),
            fresnel: gl.getUniformLocation(Texture_shaderProgram, 'uFresnel'),
          
            // ambient: gl.getUniformLocation(Texture_shaderProgram, 'uAmbientLight'),
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
    const particle_programInfo = {
        program: particle_shaderProgram,
        attribLocations: {
            start: gl.getAttribLocation(particle_shaderProgram, 'astart'),
            end: gl.getAttribLocation(particle_shaderProgram, 'aend'),
            lifetime: gl.getAttribLocation(particle_shaderProgram, 'alifetime'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(particle_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(particle_shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(particle_shaderProgram, 'uModelMatrix'),
            time:gl.getUniformLocation(particle_shaderProgram, 'utime'),
        },
    };
    const shadow_programInfo = {
        program: shadow_shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shadow_shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shadow_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(shadow_shaderProgram, 'uViewMatrix'),
            modelMatrix: gl.getUniformLocation(shadow_shaderProgram, 'uModelMatrix'),
        },
    };
    const plane_programInfo = {
        program: plane_shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(plane_shaderProgram, 'a_Position'),
            vertexColor: gl.getAttribLocation(plane_shaderProgram, 'a_Color'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(plane_shaderProgram, 'uProjectionMatrix'),
            viewMatrix: gl.getUniformLocation(plane_shaderProgram, 'uViewMatrix'),
            projectionMatrixFromLight: gl.getUniformLocation(plane_shaderProgram, 'uProjectionMatrixFromLight'),
            viewMatrixFromLight: gl.getUniformLocation(plane_shaderProgram, 'uViewMatrixFromLight'),
            modelMatrix: gl.getUniformLocation(plane_shaderProgram, 'uModelMatrix'),
            uShadowMap: gl.getUniformLocation(plane_shaderProgram, 'uShadowMap'),
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
        ctx: ctx,
        programInfo: programInfo,
        fog_programInfo: fog_programInfo,
        sky_programInfo: sky_programInfo,
        fogsky_programInfo: fogsky_programInfo,
        Texture_programInfo: Texture_programInfo,
        fog_Texture_programInfo: fog_Texture_programInfo,
        particle_programInfo: particle_programInfo,
        shadow_programInfo: shadow_programInfo,
        plane_programInfo: plane_programInfo,
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
    rotation.aixs[0] = 0.0;
}
function onMouseWheel(event){
    var distance = Math.pow(eye[0]-target[0], 2)+Math.pow(eye[1]-target[1], 2)+Math.pow(eye[2]-target[2], 2);
    distance = Math.sqrt(distance);
    if(event.deltaY>0){
        if(distance<30){
            eye[0] = target[0] + (eye[0]-target[0])*(1.0+event.deltaY*0.001);
            eye[1] = target[1] + (eye[1]-target[1])*(1.0+event.deltaY*0.001);
            eye[2] = target[2] + (eye[2]-target[2])*(1.0+event.deltaY*0.001);
        }
    }
    else{
        if(distance>3){
            eye[0] = target[0] + (eye[0]-target[0])*(1.0+event.deltaY*0.001);
            eye[1] = target[1] + (eye[1]-target[1])*(1.0+event.deltaY*0.001);
            eye[2] = target[2] + (eye[2]-target[2])*(1.0+event.deltaY*0.001);
        }
    }
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

function initTextBuffers(gl, positions, diffuse_colors, specular_colors, indices, normals, TextCoord, ambientLights) {
    //顶点缓冲区
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    //为颜色创建缓冲区
    const specular_colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, specular_colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specular_colors), gl.STATIC_DRAW);
    //为颜色创建缓冲区
    const diffuse_colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, diffuse_colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffuse_colors), gl.STATIC_DRAW);

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

    //环境光缓冲区
    const ambientLightBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ambientLightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambientLights), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        diffuse_color: diffuse_colorBuffer,
        specular_color: specular_colorBuffer,
        index: indexBuffer,
        normal: normalBuffer,
        TextCoord: TextureBuffer,
        ambientLight: ambientLightBuffer,
        indices: indices,
    }
}

function initParticleBuffers(gl, start, end, lifetime, indices) {
    //开始顶点缓冲区
    const startBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, startBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(start), gl.STATIC_DRAW);

    //结束顶点缓冲区
    const endBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, endBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(end), gl.STATIC_DRAW);

    //生存周期缓冲区
    const lifeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lifeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lifetime), gl.STATIC_DRAW);

    //索引缓冲区
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        start: startBuffer,
        end: endBuffer,
        lifetime: lifeBuffer,
        index: indexBuffer,
        indices: indices,
    }
}
function initPlaneBuffers(gl, positions, colors, indices) {
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

    return {
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
            colors.push(1.0, 1.0, 1.0, 1.0);
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

function initBoomParticle(Program, center, startscale, endscale) {
    var start = new Array();
    var end = new Array();
    var lifetime = new Array();
    var indices = new Array();
    for (i = 0; i <= 1000; i += 1) {
        lifetime.push(Math.random()*0.3);
        start.push((Math.random() * 2 - 1) * startscale + center[0]);
        start.push((Math.random() * 2 - 1) * startscale + center[1]);
        start.push((Math.random() * 2 - 1) * startscale + center[2]);
        end.push((Math.random() * 2 - 1) * endscale + center[0]);
        end.push((Math.random() * 2 - 1) * endscale + center[1]);
        end.push((Math.random() * 2 - 1) * endscale + center[2]);
        indices.push(i);
    }
    const buffers = initParticleBuffers(Program.gl, start, end, lifetime, indices);
    return buffers;
}
function initPlane(Program, center, size, color) {
    const positions = [];
    const colors = [];
    const indices = [
        0, 1, 2,
        3, 4, 5
    ];
    {
        positions.push(center[0] + size[0] / 2);  positions.push(-1.0);positions.push(center[2] + size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2);  positions.push(-1.0);positions.push(center[2] + size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] + size[0] / 2);  positions.push(-1.0);positions.push(center[2] - size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2);  positions.push(-1.0);positions.push(center[2] - size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] - size[0] / 2);  positions.push(-1.0);positions.push(center[2] + size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
        positions.push(center[0] + size[0] / 2);  positions.push(-1.0);positions.push(center[2] - size[1] / 2);
        colors.push(color[0], color[1], color[2], color[3]);
    }
    const buffers = initPlaneBuffers(Program.gl, positions, colors, indices);
    return buffers;
}

function initFramebufferObject(gl) {
    var framebuffer, texture, depthBuffer;

    // Define the error handling function
    var error = function () {
        if (framebuffer) gl.deleteFramebuffer(framebuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    // Create a framebuffer object (FBO)
    framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
        console.log('Failed to create frame buffer object');
        return error();
    }

    // Create a texture object and set its size and parameters
    texture = gl.createTexture(); // Create a texture object
    if (!texture) {
        console.log('Failed to create texture object');
        return error();
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Create a renderbuffer object and Set its size and parameters
    depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    // Attach the texture and the renderbuffer object to the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    // Check if FBO is configured correctly
    var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    framebuffer.texture = texture; // keep the required object

    // Unbind the buffer object
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return framebuffer;
}