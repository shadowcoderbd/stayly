import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hotelKeys } from "@/features/hotels";
import { toast } from "@/lib/toast";
import { adminHotelApi } from "../api/admin-hotel.api";
import { adminHotelKeys } from "../queries";
import type { HotelInput, HotelPatch } from "@/server/modules/hotel/hotel.types";

/** Admin changes also change what customers see, so both caches are refreshed. */
function useInvalidateHotels() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminHotelKeys.all }),
      queryClient.invalidateQueries({ queryKey: hotelKeys.all }),
    ]);
}

type CreateVars = { input: HotelInput; photos: { file: File; alt: string }[]; publish: boolean };

/** Create hidden → upload the chosen photos → publish if asked (a published hotel needs a photo). */
export function useCreateHotel() {
  const invalidate = useInvalidateHotels();
  const { mutate: createHotel, isPending: isCreating } = useMutation({
    mutationFn: async ({ input, photos, publish }: CreateVars) => {
      const { data: created } = await adminHotelApi.create({ ...input, status: "hidden" });
      if (photos.length > 0) await adminHotelApi.uploadImages(created.id, photos);
      if (publish) await adminHotelApi.update(created.id, { status: "published" });
      return { hotel: created, message: publish ? `${created.name} is published.` : `${created.name} saved as hidden.` };
    },
    onSuccess: ({ message }) => {
      toast.success(message);
      return invalidate();
    },
    // A failed upload or publish leaves a hidden hotel behind: refresh so it shows up to finish later.
    onError: () => invalidate(),
  });
  return { createHotel, isCreating };
}

export function useUpdateHotel(id: string) {
  const invalidate = useInvalidateHotels();
  const { mutate: updateHotel, isPending: isUpdating } = useMutation({
    mutationFn: (input: HotelPatch) => adminHotelApi.update(id, input),
    onSuccess: (res) => {
      toast.success(res.message);
      return invalidate();
    },
  });
  return { updateHotel, isUpdating };
}

export function usePhotoMutations(hotelId: string) {
  const invalidate = useInvalidateHotels();
  const options = {
    onSuccess: (res: { message: string }) => {
      toast.success(res.message);
      return invalidate();
    },
  };

  const upload = useMutation({ mutationFn: (files: { file: File; alt: string }[]) => adminHotelApi.uploadImages(hotelId, files), ...options });
  const arrange = useMutation({ mutationFn: (images: { id: string; alt: string }[]) => adminHotelApi.arrangeImages(hotelId, images), ...options });
  const remove = useMutation({ mutationFn: (imageId: string) => adminHotelApi.removeImage(hotelId, imageId), ...options });

  return {
    uploadPhotos: upload.mutate,
    isUploading: upload.isPending,
    arrangePhotos: arrange.mutate,
    isArranging: arrange.isPending,
    removePhoto: remove.mutate,
    isRemoving: remove.isPending,
  };
}
