import re

file_path = "src/features/experimental-premium-editor/components/CardImage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the img tag
new_img = """
          {(() => {
            if (!product.image || product.imageState === "preparing") return null;
            
            let src = product.image;
            let srcSet = undefined;
            let sizes = undefined;
            
            const isFuxionImage = src.includes("/productos-fuxion/productos/");
            if (isFuxionImage) {
              const parts = src.split("/");
              const filename = parts.pop() || "";
              const name = filename.substring(0, filename.lastIndexOf('.'));
              
              const w640 = `/productos-fuxion/optimized/${name}-640.webp`;
              const w960 = `/productos-fuxion/optimized/${name}-960.webp`;
              
              srcSet = `${w640} 640w, ${w960} 960w`;
              sizes = "(max-width: 768px) 100vw, 400px";
              src = w640;
            }
            
            return (
              <img
                src={src}
                srcSet={srcSet}
                sizes={sizes}
                alt={product.title}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                decoding="async"
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-200 ease-premium",
                  product.imageState === "error" ? "opacity-45" : "opacity-100",
                )}
              />
            );
          })()}
"""

# Replace the old img block
pattern = r'\{product\.image && product\.imageState !== "preparing" && \([\s\S]*?<img[\s\S]*?/>[\s\S]*?\)\}'
content = re.sub(pattern, new_img.strip(), content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("CardImage updated")
