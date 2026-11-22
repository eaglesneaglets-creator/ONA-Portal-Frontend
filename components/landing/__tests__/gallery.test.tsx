/**
 * The homepage gallery: uniform tiles whose column count follows the number
 * of photos (so two photos fill the row), and a viewer that shows the whole
 * uncropped photo with previous/next.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingGallery } from "@/components/landing/gallery";
import { columnsFor } from "@/components/landing/gallery-grid";
import type { SiteContent } from "@/lib/api/content";

const photo = (n: number, caption = ""): SiteContent["gallery"][number] => ({
  id: `g${n}`,
  caption,
  image: { id: `m${n}`, src: `/api/v1/content/media/m${n}/`, width: n === 2 ? 640 : 1200, height: n === 2 ? 1280 : 900, alt: `Photo ${n}` },
});

describe("columnsFor", () => {
  it("fills rows: 2 photos side by side (stacked on phones), 4 as a row of four on laptops, never more than 4", () => {
    expect(columnsFor(1)).toEqual({ base: 1, sm: 1, lg: 1 });
    expect(columnsFor(2)).toEqual({ base: 1, sm: 2, lg: 2 });
    expect(columnsFor(3).lg).toBe(3);
    expect(columnsFor(4)).toEqual({ base: 2, sm: 2, lg: 4 });
    expect(columnsFor(8).lg).toBe(4);
    expect(columnsFor(7).lg).toBe(3);
    for (let n = 1; n < 30; n++) expect(columnsFor(n).lg).toBeLessThanOrEqual(4);
  });
});

describe("LandingGallery", () => {
  it("renders nothing without photos", () => {
    const { container } = render(<LandingGallery items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("gives every photo the same 4:3 tile, whatever its own shape", () => {
    render(<LandingGallery items={[photo(1, "Live room"), photo(2, "Nord on the desk")]} />);
    const tiles = screen.getAllByRole("button", { name: /^View photo/ });
    expect(tiles).toHaveLength(2);
    for (const t of tiles) expect(t.className).toContain("aspect-[4/3]");
    // Two photos: side by side from tablets up (stacked on phones), never beside an empty column.
    for (const li of screen.getByRole("list").querySelectorAll("li")) expect(li.className).toContain("lg:w-[calc((100%-1rem)/2)]");
    expect(screen.getByText("Live room")).toBeTruthy();
  });

  it("on a phone, an odd count leads with one full-width photo so none sits alone", () => {
    render(<LandingGallery items={[photo(1), photo(2), photo(3)]} />);
    const lis = [...screen.getByRole("list").querySelectorAll("li")];
    expect(lis[0].className.split(" ")[0]).toBe("w-full");
    expect(lis[1].className.split(" ")[0]).toBe("w-[calc((100%-1rem)/2)]");
    expect(lis[2].className.split(" ")[0]).toBe("w-[calc((100%-1rem)/2)]");
  });

  it("opens the whole photo and steps through the rest", () => {
    render(<LandingGallery items={[photo(1, "Live room"), photo(2, "Nord on the desk"), photo(3)]} />);
    fireEvent.click(screen.getByRole("button", { name: "View photo: Photo 2" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 / 3")).toBeTruthy();
    // The tall photo is shown at its own proportions, not cropped to the tile.
    const img = within(dialog).getByRole("img", { name: "Photo 2" });
    expect(img.getAttribute("width")).toBe("640");
    expect(img.getAttribute("height")).toBe("1280");
    fireEvent.click(within(dialog).getByRole("button", { name: "Next photo" }));
    expect(within(dialog).getByText("3 / 3")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("1 / 3")).toBeTruthy();
  });
});
