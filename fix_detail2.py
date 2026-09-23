import re

file_path = "src/features/experimental-premium-editor/components/ProductDetailView.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_img = """
                  {(() => {
                    let src = product.image;
                    let srcSet = undefined;
                    let sizes = undefined;
                    
                    // We know product.image is truthy here
                    const isFuxionImage = src.includes("/productos-fuxion/productos/");
                    if (isFuxionImage) {
                      const parts = src.split("/");
                      const filename = parts.pop() || "";
                      const name = filename.substring(0, filename.lastIndexOf('.'));
                      
                      const w960 = `/productos-fuxion/optimized/${name}-960.webp`;
                      const w1440 = `/productos-fuxion/optimized/${name}-1440.webp`;
                      
                      srcSet = `${w960} 960w, ${w1440} 1440w`;
                      sizes = "(max-width: 1024px) 100vw, 800px";
                      src = w960;
                    }
                    
                    return (
                      <img
                        src={src}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={product.title}
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    );
                  })()}
"""

pattern = r'<img\s+src=\{product\.image\}[\s\S]*?className="aspect-\[4/3\] w-full object-cover"\s*/>'
content = re.sub(pattern, new_img.strip(), content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("ProductDetailView updated correctly")
