## 飞机模拟器

### objloader使用

objloader使用时只需调用

```
function LoadObjFile(gl, fileName, buffers, scale, inverse, index)
```

gl为webGL上下文；

fileName为obj文件的路径+文件名；

buffers为自定义的buffer数组，用于返回LoadObjFile加载好的模型绘制信息；

scale为缩放大小；

inverse表示面的法线方向，若为1表示与模型定义的法线方向相反；

index为buffers中的索引，用于指明存放于buffers的位置