// @vitest-environment happy-dom
import { act, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoConfig } from "../../../premium-template-studio/templates/definitions";
import { EditorProvider, useEditor } from "../contexts/EditorContext";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const editor = useEditor();
  const heroId = editor.canonicalDocument?.blocks.find((block) => block.type === "hero")?.id ?? "hero-1";
  const titleEdited = useRef(false);
  const imageZoomed = useRef(false);

  useEffect(() => {
    if (editor.selection?.id === `${heroId}:hero-title` && !titleEdited.current) {
      titleEdited.current = true;
      editor.setText(`${heroId}:hero-title`, "Título editado");
    }
  }, [editor, heroId]);

  useEffect(() => {
    if (editor.selection?.id === `${heroId}:hero-image` && !imageZoomed.current) {
      imageZoomed.current = true;
      editor.setProp(`${heroId}:hero-image`, "zoom", "1.5");
    }
  }, [editor, heroId]);

  return (
    <>
      <div
        ref={(element) => {
          if (!element) return;
          editor.register({
            id: `${heroId}:hero-title`,
            kind: "text",
            label: "Título",
            blockKey: heroId,
            el: element,
          });
          editor.register({
            id: `${heroId}:hero-image`,
            kind: "image",
            label: "Imagen",
            blockKey: heroId,
            el: element,
          });
        }}
      />
      <button data-testid="select-title" onClick={() => editor.select(`${heroId}:hero-title`)} />
      <button data-testid="select-image" onClick={() => editor.select(`${heroId}:hero-image`)} />
      <button data-testid="undo" onClick={editor.undo} />
      <button data-testid="redo" onClick={editor.redo} />
      <button data-testid="publish" onClick={editor.publish} />
      <output data-testid="title">{editor.canonicalDocument?.blocks.find((block) => block.id === heroId)?.content.title ?? ""}</output>
      <output data-testid="zoom-value">
        {editor.canonicalDocument?.blocks.find((block) => block.id === heroId)?.content.avatar?.media?.zoom ?? ""}
      </output>
    </>
  );
}

describe("Bridge 4.1 canonical write flow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("emits semantic canonical mutations, keeps Magic separate, and supports undo/redo/publish", async () => {
    const initial = createDemoConfig();
    const hero = initial.blocks[0]!;
    hero.type = "hero";
    hero.content = { ...hero.content, title: "Título original", avatar: { ...hero.content.avatar } };
    const changes: typeof initial[] = [];
    const publishes: typeof initial[] = [];
    const magicChange = vi.fn();
    const magicPublish = vi.fn();

    await act(async () => {
      root.render(
        <EditorProvider
          canonicalDocument={initial}
          onCanonicalDocumentChange={(config) => { changes.push(config); }}
          onCanonicalPublish={(config) => { publishes.push(config); }}
          onDocumentChange={magicChange}
          onPublish={magicPublish}
        >
          <Probe />
        </EditorProvider>,
      );
    });

    const click = async (testId: string) => {
      await act(async () => {
        container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click();
      });
    };

    await click("select-title");
    await act(async () => Promise.resolve());
    expect(container.querySelector("[data-testid=title]")?.textContent).toBe("Título editado");
    const heroId = hero.id;
    expect(changes.at(-1)?.blocks.find((block) => block.id === heroId)?.content.title).toBe("Título editado");
    expect(changes.at(-1)?.blocks.find((block) => block.id === heroId)?.id).toBe(heroId);
    expect(magicChange).not.toHaveBeenCalled();

    await click("select-image");
    await act(async () => Promise.resolve());
    expect(container.querySelector("[data-testid=zoom-value]")?.textContent).toBe("1.5");
    expect(changes.at(-1)?.blocks[0]?.content.avatar?.media?.zoom).toBe(1.5);
    expect(changes.at(-1)?.blocks.find((block) => block.id === heroId)?.content.title).toBe("Título editado");

    await click("undo");
    expect(container.querySelector("[data-testid=zoom-value]")?.textContent).toBe("");
    await click("redo");
    expect(container.querySelector("[data-testid=zoom-value]")?.textContent).toBe("1.5");

    await click("publish");
    await act(async () => Promise.resolve());
    expect(publishes.at(-1)?.blocks.find((block) => block.id === heroId)?.content.title).toBe("Título editado");
    expect(magicPublish).not.toHaveBeenCalled();
  });
});
