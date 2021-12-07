//代码中有参考《webGL编程指南》一书中关于ObjViewer的编程结构

//------------------------------------------------------------------------------
// StringParser
//------------------------------------------------------------------------------

// Constructor
var StringParser = function(str) {
  this.str;   // Store the string specified by the argument
  this.index; // Position in the string to be processed
  this.init(str);
}
// Initialize StringParser object
StringParser.prototype.init = function(str){
  this.str = str;
  this.index = 0;
}

// Skip delimiters
StringParser.prototype.skipDelimiters = function()  {
  for(var i = this.index, len = this.str.length; i < len; i++){
    var c = this.str.charAt(i);
    // Skip TAB, Space, '(', ')
    if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"') continue;
    break;
  }
  this.index = i;
}

// Skip to the next word
StringParser.prototype.skipToNextWord = function() {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  this.index += (n + 1);
}

// Get word
StringParser.prototype.getWord = function() {
  this.skipDelimiters();
  var n = getWordLength(this.str, this.index);
  if (n == 0) return null;
  var word = this.str.substr(this.index, n);
  this.index += (n + 1);

  return word;
}

// Get integer
StringParser.prototype.getInt = function() {
  return parseInt(this.getWord());
}

// Get floating number
StringParser.prototype.getFloat = function() {
  return parseFloat(this.getWord());
}

StringParser.prototype.getRGB = function(){
  var r = this.getFloat();
  var g = this.getFloat();
  var b = this.getFloat();
  return new Color(r, g, b);
}


var Color = function(r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
}
// Get the length of word
function getWordLength(str, start) {
  var n = 0;
  for(var i = start, len = str.length; i < len; i++){
    var c = str.charAt(i);
    if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"') 
    break;
  }
  return i - start;
}

//------------------------------------------------------------------------------
// OBJParser
//------------------------------------------------------------------------------
var OBJDoc = function(fileName) {
  this.fileName = fileName;
  this.mtls = new Array(0);      // Initialize the property for MTL
  this.objects = new Array(0);   // Initialize the property for Object
  this.vertices = new Array(0);  // Initialize the property for Vertex
  this.normals = new Array(0);   // Initialize the property for Normal
  this.texture = null;   // Initialize the property for texture
  this.textureCoords = new Array(0);
}

async function onloadMTLFile(sp, objdoc){
              //当第三方api提供的是异步方法时 这里用setTimeout模拟
                var path = getPath(objdoc.fileName);
                var mtl = new MTLDoc();   // Create MTL instance
                objdoc.mtls.push(mtl);
                var request = new XMLHttpRequest();
                request.onreadystatechange = function() {
                  if (request.readyState == 4) {
                    if (request.status != 404) {
                      loadMTLFile(request.responseText, mtl);
                    }else{
                      mtl.complete = true;
                    }
                  }
                }
                request.open('GET', path + sp.getWord(), true);  // Create a request to acquire the file
                request.send();   
}

//fileString: obj文件的内容
OBJDoc.prototype.parse = function(fileString, scale, inverse){
  var lines = fileString.split('\n');
  lines.push(null);
  var index = 0;

  var currentObject = null;
  var currentMaterialName = "";

  //逐行解析
  var line = "";
  var sp = new StringParser();  // Create StringParser
  while ((line = lines[index++]) != null) {
    sp.init(line);                  // init StringParser
    var command = sp.getWord();     // Get command
    if(command == null)
      continue;  // check null command

      switch(command){
          //comment
          case '#':
              continue;
          //mtl
          case 'mtllib':

              // Send the request
              onloadMTLFile(sp, this).then(res => {
                console.log("mtl load complete.");
              })
              continue;
          //read object name
          case 'o':case 'g':
              var objname = sp.getWord();
              var object  = new OBJObject(objname);
              this.objects.push(object);
              currentObject = object;
              continue;
          //坐标信息
          case 'v':
              var x = sp.getFloat() * scale;
              var y = sp.getFloat() * scale;
              var z = sp.getFloat() * scale;
              var vertex = new Vertex(x, y, z);
              this.vertices.push(vertex);
              continue;
          //法向量信息
          case 'vn':
              var x = sp.getFloat() * scale;
              var y = sp.getFloat() * scale;
              var z = sp.getFloat() * scale;
              var vertex = new Vertex(x, y, z);
              this.normals.push(vertex);
              continue;
          //纹理坐标信息
          case 'vt':
              var x = sp.getFloat() * 1;
              var y = sp.getFloat() * 1;
              var vertex = new Vertex2(x, y);
              this.textureCoords.push(vertex);
              continue;
          case 'usemtl':
              currentMaterialName = sp.getWord();
              continue;
          //解析平面
          case 'f':
              var face = new Face(currentMaterialName);
              while(1){
                  var num_words = sp.getWord();
                  if(!num_words)
                      break;
                  //面信息以v/vt/vn的形式出现，所以从中解析三个值
                  var nums = (num_words.split('/'));

                  var vi = parseInt(nums[0]) - 1;
                  var ti = -1;
                  var ni = -1;
                  if(nums.length >= 2)
                      var ti = parseInt(nums[1]) - 1;
                  if(nums.length >= 3)
                      var ni = parseInt(nums[2]) - 1;
                  face.vIndices.push(vi);
                  face.tIndices.push(ti);
                  face.nIndices.push(ni);
              }
              //计算面的法向量

              var normal = calcNormal(this.vertices[face.vIndices[0]], this.vertices[face.vIndices[1]], this.vertices[face.vIndices[2]]);                
              if(inverse)
                  vec3.inverse(normal, normal);
              vec3.copy(face.normal, normal);
              //将面分为三角形
              if(face.vIndices.length > 3){
                  var n = face.vIndices.length - 2;
                  var newVIndices = new Array(n * 3);
                  var newTIndices = new Array(n * 3);
                  var newNIndices = new Array(n * 3);
                  for(var i=0; i < n; i++){
                    newVIndices[i * 3 + 0] = face.vIndices[0];
                    newVIndices[i * 3 + 1] = face.vIndices[i + 1];
                    newVIndices[i * 3 + 2] = face.vIndices[i + 2];
                    newTIndices[i * 3 + 0] = face.tIndices[0];
                    newTIndices[i * 3 + 1] = face.tIndices[i + 1];
                    newTIndices[i * 3 + 2] = face.tIndices[i + 2];
                    newNIndices[i * 3 + 0] = face.nIndices[0];
                    newNIndices[i * 3 + 1] = face.nIndices[i + 1];
                    newNIndices[i * 3 + 2] = face.nIndices[i + 2];
                  }
                  face.vIndices = newVIndices;
                  face.tIndices = newTIndices;
                  face.nIndices = newNIndices;
              }
              face.numIndices = face.vIndices.length;

              currentObject.addFace(face);
              continue;
          default:
              continue;
      }
  }
  return true;
}
function getPath(fileName) {
  // Get directory path
  var i = fileName.lastIndexOf("/");
  if(i)
    return fileName.substr(0, i+1);
  else
    return "";  
}
//------------------------------------------------------------------------------
// OBJObject Object
//------------------------------------------------------------------------------
var OBJObject = function(name) {
  this.name = name;
  this.faces = new Array(0);
  this.numIndices = 0;
}

OBJObject.prototype.addFace = function(face) {
  this.faces.push(face);
  this.numIndices += face.numIndices;
}

//------------------------------------------------------------------------------
// Vertex Object
//------------------------------------------------------------------------------
var Vertex = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}
var Vertex2 = function(x, y) {
  this.x = x;
  this.y = y;
}

//------------------------------------------------------------------------------
// Face Object
//------------------------------------------------------------------------------
var Face = function(materialName) {
  this.materialName = materialName;
  if(materialName == null)  this.materialName = "";
  this.vIndices = new Array(0);
  this.tIndices = new Array(0);
  this.nIndices = new Array(0);
  this.numIndices = 0;
  this.normal = vec3.create();
}

function calcNormal(v0, v1, v2){
  var p = vec3.create();
  var p1 = vec3.fromValues(p1, v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
  var p2 = vec3.fromValues(p2, v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
  vec3.cross(p, p1, p2);
  vec3.normalize(p, p);
  return p;
}


//------------------------------------------------------------------------------
// MTLParser
//------------------------------------------------------------------------------
var MTLDoc = function() {
this.complete = false;
this.mtls = new Array(0);      // 材质信息
this.texture = null;
}

var Material = function(name, ka, kd, ks, ke, ni, d, illum){
this.name = name;
this.ka = ka;
this.kd = kd;
this.ks = ks;
this.ke = ke;
this.ni = ni;
this.d = d;
this.illum = illum;
}


//------------------------------------------------------------------------------
// LoadObjFile
//------------------------------------------------------------------------------

// Read a file
//buffers为全局变量，用于返回构造的buffer，scale为缩放程度，inverse用于指明法线方向是否与模型相反，index为buffer的索引位置
function LoadObjFile(gl, fileName, buffers, scale, inverse) {
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState === 4 && request.status !== 404) {
      //objDocs为解析出来的obj模型信息对象
      var objDocs = new OBJDoc(fileName);  // Create a OBJDoc object
      var positions = new Array(0);
      var indices = new Array(0);
      var normals = new Array(0);
      var textureCoords = new Array(0);
      var colors = new Array(0);

      var result = objDocs.parse(request.responseText, scale, inverse); // Parse the file
      //将obj模型的信息压入positions,colors,indices,normals, 并用其构造buffer
      // for(var i = 0; i < objDocs.vertices.length; i++)
      //     positions.push(objDocs.vertices[i].x, objDocs.vertices[i].y, objDocs.vertices[i].z);
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
  }
  request.open('GET', fileName, true); // Create a request to acquire the file
  request.send();                      // Send the request
}

function loadMTLFile(fileString, mtl){
var lines = fileString.split('\n');
lines.push(null);
var index = 0;

//逐行解析
var line = "";
var currentmaterial = new Material("");
var sp = new StringParser();  // Create StringParser
while ((line = lines[index++]) != null) {
  sp.init(line);                  // init StringParser
  var command = sp.getWord();     // Get command
  if(command == null)
    continue;  // check null command

    switch(command){
        //comment
        case '#':
            continue;
        //mtl
        case 'newmtl':
            //非空说明刚读完一个mtl，准备读下一个，所以将其push
            if(currentmaterial.name != ""){
              mtl.mtls.push(currentmaterial);
            }
            currentmaterial.name = sp.getWord();
            continue;
        //反射指数
        case 'Ns':
            currentmaterial.Ns = sp.getFloat();
            continue;
        //环境反射
        case 'Ka':
            currentmaterial.Ka = sp.getRGB();
            continue;
        //漫反射
        case 'Kd':
            currentmaterial.Kd = sp.getRGB();
            continue;
        //镜面反射
        case 'Ks':
            currentmaterial.Ks = sp.getRGB();
            continue;
        //放射光
        case 'Ke':
            currentmaterial.Ke = sp.getRGB();
            continue;
        //折射值描述
        case 'Ni':
            currentmaterial.Ni = sp.getFloat();
            continue;
        //照明度
        case 'illum':
            currentmaterial.illum = sp.getInt();
            continue;
        // 渐隐指数
        case 'd':
            currentmaterial.d = sp.getFloat();
            continue;
        //为漫反射指定文件
        case 'map_Kd':
            // sp.getWord();sp.getWord();
            // var texname = sp.getWord();
            // mtl.texture = loadTexture(gl, path + texname);
            continue;
        default:
            continue;
    }
}
mtl.complete = true;
}