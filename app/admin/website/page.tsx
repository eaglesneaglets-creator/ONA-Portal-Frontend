"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { GalleryEditor } from "@/components/admin/website/gallery-editor";
import { HomepageEditor } from "@/components/admin/website/homepage-editor";
import { MediaLibrary } from "@/components/admin/website/media-library";
import { ReviewsEditor } from "@/components/admin/website/reviews-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * /admin/website — what the public website shows that ONA edits itself: the
 * homepage hero, the "Inside ONA" gallery, the quoted reviews and the Google
 * rating, and the media library their images come from. Every change is in
 * the audit log; the public pages pick it up within about a minute.
 *
 * Social profiles and contact details are on Questions & contact (/admin/content).
 */
export default function AdminWebsitePage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Website"
        description="The homepage photo and words, the gallery, the reviews and the images they use."
        actions={
          <Button asChild variant="outline" className="h-11 md:h-9">
            <Link href="/" target="_blank">
              <ExternalLink aria-hidden="true" />
              View the homepage
            </Link>
          </Button>
        }
      />
      <Tabs defaultValue="homepage" className="gap-5">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="homepage" className="min-h-11 md:min-h-8">Homepage</TabsTrigger>
          <TabsTrigger value="gallery" className="min-h-11 md:min-h-8">Gallery</TabsTrigger>
          <TabsTrigger value="reviews" className="min-h-11 md:min-h-8">Reviews</TabsTrigger>
          <TabsTrigger value="media" className="min-h-11 md:min-h-8">Media library</TabsTrigger>
        </TabsList>
        <TabsContent value="homepage"><HomepageEditor /></TabsContent>
        <TabsContent value="gallery"><GalleryEditor /></TabsContent>
        <TabsContent value="reviews"><ReviewsEditor /></TabsContent>
        <TabsContent value="media"><MediaLibrary /></TabsContent>
      </Tabs>
    </div>
  );
}
