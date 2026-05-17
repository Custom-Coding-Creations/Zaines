'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from '@/components/admin/AdminAsyncState';
import { safeJsonResponse } from '@/lib/safe-json-response';

type BookingOption = {
  id: string;
  bookingNumber: string;
  status: string;
  user: { name: string | null; email: string | null } | null;
  bookingPets: Array<{ pet: { id: string; name: string; breed: string } | null }>;
};

type PhotoItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
  pet: { id: string; name: string; breed: string };
  booking: { id: string; bookingNumber: string; status: string } | null;
};

type PetOption = {
  id: string;
  name: string;
  breed: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export function PhotoUploadPanel({ initialBookingId = '' }: { initialBookingId?: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bookings, setBookings] = useState<BookingOption[]>([]);
  const [pets, setPets] = useState<PetOption[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [bookingId, setBookingId] = useState('none');
  const [petId, setPetId] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [targetByPhotoId, setTargetByPhotoId] = useState<Record<string, string>>({});
  const [savingByPhotoId, setSavingByPhotoId] = useState<Record<string, boolean>>({});

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.status === 'checked_in'),
    [bookings],
  );
  const selectedBooking = activeBookings.find((booking) => booking.id === bookingId);
  const selectedPets = useMemo(
    () =>
      selectedBooking?.bookingPets
        .map((bp) => bp.pet)
        .filter((pet): pet is NonNullable<typeof pet> => Boolean(pet)) ?? [],
    [selectedBooking],
  );
  const availablePets = useMemo(
    () => (bookingId === 'none' ? pets : selectedPets),
    [bookingId, pets, selectedPets],
  );

  const previewUrl = useMemo(() => {
    if (!file) return '';
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const activePetId = useMemo(() => {
    if (!availablePets.length) return '';
    return availablePets.some((p) => p.id === petId) ? petId : (availablePets[0]?.id ?? '');
  }, [availablePets, petId]);

  async function loadData(options?: { resetLoading?: boolean }) {
    const shouldResetLoading = options?.resetLoading ?? true;
    if (shouldResetLoading) {
      setLoading(true);
      setError('');
    }

    try {
      const [bookingsRes, petsRes, photosRes] = await Promise.all([
        fetch('/api/admin/bookings?status=checked_in', { cache: 'no-store' }),
        fetch('/api/admin/pets?limit=200', { cache: 'no-store' }),
        fetch('/api/admin/photos?limit=30&includeUnassigned=true', { cache: 'no-store' }),
      ]);

      const bookingsData = await safeJsonResponse<{
        bookings?: BookingOption[];
        data?: BookingOption[];
        error?: string;
      }>(bookingsRes, {});
      const petsData = await safeJsonResponse<{ pets?: PetOption[]; error?: string }>(petsRes, {});
      const photosData = await safeJsonResponse<{ photos?: PhotoItem[]; error?: string }>(photosRes, {});

      if (!bookingsRes.ok) {
        throw new Error(bookingsData.error ?? 'Unable to load bookings');
      }
      if (!petsRes.ok) {
        throw new Error(petsData.error ?? 'Unable to load pets');
      }
      if (!photosRes.ok) {
        throw new Error(photosData.error ?? 'Unable to load photos');
      }

      const loadedBookings = bookingsData.bookings ?? bookingsData.data ?? [];
      setBookings(loadedBookings);
      setPets(petsData.pets ?? []);
      const loadedPhotos = photosData.photos ?? [];
      setPhotos(loadedPhotos);
      setTargetByPhotoId(
        loadedPhotos.reduce<Record<string, string>>((acc, photo) => {
          acc[photo.id] = photo.booking?.id ?? 'none';
          return acc;
        }, {}),
      );

      const preselectedBooking =
        loadedBookings.find(
          (booking) => booking.status === 'checked_in' && booking.id === initialBookingId,
        ) ?? loadedBookings.find((booking) => booking.status === 'checked_in');

      if (preselectedBooking && bookingId === 'none' && initialBookingId) {
        setBookingId(preselectedBooking.id);
        const firstPet = preselectedBooking.bookingPets.find((bp) => bp.pet)?.pet;
        if (firstPet) {
          setPetId(firstPet.id);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load photo data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
     
    void loadData({ resetLoading: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookingId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Select an image before uploading.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      if (bookingId !== 'none') {
        formData.set('bookingId', bookingId);
      }
      formData.set('petId', activePetId);
      formData.set('caption', caption);
      formData.set('file', file);
      formData.set('notifyOwner', String(notifyOwner));

      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await safeJsonResponse<{ photo?: PhotoItem; error?: string }>(res, {});
      if (!res.ok || !data.photo) {
        throw new Error(data.error ?? 'Unable to upload photo');
      }

      // Queue notification if owner notification is enabled
      if (notifyOwner && data.photo && bookingId !== 'none' && selectedBooking?.user?.email) {
        try {
          await fetch('/api/admin/photo-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photoId: data.photo.id,
              bookingId,
              petName: availablePets.find((p) => p.id === activePetId)?.name,
              ownerEmail: selectedBooking.user.email,
              notifyOwner,
            }),
          });
        } catch (notificationError) {
          console.error('Error queuing notification:', notificationError);
          // Continue anyway - photo was uploaded successfully
        }
      }

      setPhotos((current) => [data.photo as PhotoItem, ...current]);
      setCaption('');
      setFile(null);
      setPetId('');
      setNotifyOwner(true);
      setSuccess('Photo uploaded.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload photo');
    } finally {
      setSaving(false);
    }
  }

  async function handleReassociatePhoto(photoId: string) {
    const nextBookingId = targetByPhotoId[photoId] ?? 'none';

    setSavingByPhotoId((state) => ({ ...state, [photoId]: true }));
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: nextBookingId === 'none' ? null : nextBookingId,
        }),
      });

      const data = await safeJsonResponse<{ error?: string }>(response, {});
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to update photo association');
      }

      setSuccess('Photo association updated.');
      await loadData({ resetLoading: false });
    } catch (reassociateError) {
      setError(
        reassociateError instanceof Error
          ? reassociateError.message
          : 'Unable to update photo association',
      );
    } finally {
      setSavingByPhotoId((state) => ({ ...state, [photoId]: false }));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Upload Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Booking</p>
              <Select value={bookingId} onValueChange={setBookingId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select booking or account-level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Account-level (no booking)</SelectItem>
                  {activeBookings.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.bookingNumber} - {booking.user?.name ?? booking.user?.email ?? 'Guest'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loading && activeBookings.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No checked-in bookings are available yet.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Pet</p>
              <Select value={activePetId} onValueChange={setPetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select pet" />
                </SelectTrigger>
                <SelectContent>
                  {availablePets.map((pet) => (
                    <SelectItem key={pet.id} value={pet.id}>
                      {pet.name} ({pet.breed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bookingId === 'none' && (
                <p className="text-xs text-muted-foreground">
                  Account-level uploads attach to the pet owner without a booking context.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Image</p>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Caption (optional)</p>
              <Input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Quick update for the owner" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <input
                type="checkbox"
                id="notify-owner"
                checked={notifyOwner}
                onChange={(e) => setNotifyOwner(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="notify-owner" className="text-sm font-medium cursor-pointer">
                Notify owner of this photo
              </label>
            </div>

            {previewUrl && (
              <div className="overflow-hidden rounded-md border">
                <Image src={previewUrl} alt="Preview" width={640} height={360} className="h-auto w-full" />
              </div>
            )}

            {error && !loading && (
              <AdminErrorState
                message={error}
                action={{ label: 'Retry', onAction: () => void loadData() }}
              />
            )}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <Button type="submit" className="w-full" disabled={saving || !activePetId || !file || loading}>
              {saving ? 'Uploading…' : 'Upload Photo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Photos</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AdminLoadingState message="Loading photos…" />
          ) : error ? (
            <AdminErrorState
              message={error}
              action={{ label: 'Retry', onAction: () => void loadData() }}
            />
          ) : photos.length === 0 ? (
            <AdminEmptyState
              title="No photos uploaded"
              message="Upload a photo after check-in to start building owner updates."
              action={{ label: 'View Checked-In Bookings', href: '/admin/bookings?status=checked_in' }}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-md border">
                  <Image
                    src={photo.imageUrl}
                    alt={photo.caption ?? `${photo.pet.name} photo`}
                    width={480}
                    height={320}
                    className="h-36 w-full object-cover"
                  />
                  <div className="space-y-1 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{photo.pet.name}</Badge>
                      <span className="text-muted-foreground">
                        {photo.booking?.bookingNumber ?? 'Account-level'}
                      </span>
                    </div>
                    {photo.caption && <p>{photo.caption}</p>}
                    <p className="text-muted-foreground">
                      {new Date(photo.uploadedAt).toLocaleString()} by {photo.uploadedBy ?? 'staff'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Select
                        value={targetByPhotoId[photo.id] ?? 'none'}
                        onValueChange={(value) =>
                          setTargetByPhotoId((state) => ({
                            ...state,
                            [photo.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assign booking" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Account-level</SelectItem>
                          {activeBookings.map((booking) => (
                            <SelectItem key={booking.id} value={booking.id}>
                              {booking.bookingNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleReassociatePhoto(photo.id)}
                        disabled={savingByPhotoId[photo.id] === true}
                      >
                        {savingByPhotoId[photo.id] ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
