import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationPickerMap } from "@/components/ui/LocationPickerMap";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { useSimpleAuthContext } from "@/components/SimpleAuthProvider";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Client = Database["public"]["Tables"]["clients"]["Row"];

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

interface ClientFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  dni?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  province?: string;
  latitude?: string;
  longitude?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    suburb?: string;
    road?: string;
    house_number?: string;
  };
}

export function ClientForm({ open, onOpenChange, client }: ClientFormProps) {
  const { profile } = useSimpleAuthContext();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!client;

  const [activeTab, setActiveTab] = useState("data");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>();

  const latitudeValue = watch("latitude");
  const longitudeValue = watch("longitude");

  const hasValidCoords = Number.isFinite(Number(latitudeValue)) && Number.isFinite(Number(longitudeValue));

  const mapLat = hasValidCoords ? Number(latitudeValue) : null;
  const mapLng = hasValidCoords ? Number(longitudeValue) : null;

  const parseCoordinate = (value: string | undefined, min: number, max: number, label: string): number | null => {
    if (!value || value.trim() === "") return null;
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      throw new Error(`${label} invalida. Rango permitido: ${min} a ${max}`);
    }
    return parsed;
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) return;

      const data = await response.json();
      if (!data?.address) return;

      const detectedCity = data.address.city || data.address.town || data.address.village || "";
      const detectedProvince = data.address.state || "";
      const detectedAddress = [data.address.road, data.address.house_number, data.address.suburb]
        .filter(Boolean)
        .join(" ");

      if (detectedCity) setValue("city", detectedCity, { shouldDirty: true });
      if (detectedProvince) setValue("province", detectedProvince, { shouldDirty: true });
      if (detectedAddress) setValue("address", detectedAddress, { shouldDirty: true });

      setLocationLabel(data.display_name || "");
    } catch {
      // Reverse geocoding is best-effort, don't block the user
    }
  }, [setValue]);

  const handleMapLocationSelect = useCallback((lat: number, lng: number) => {
    setValue("latitude", lat.toFixed(6), { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng.toFixed(6), { shouldValidate: true, shouldDirty: true });
    setSearchResults([]);
    reverseGeocode(lat, lng);
  }, [setValue, reverseGeocode]);

  const selectLocationResult = (result: NominatimResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("La ubicacion seleccionada no tiene coordenadas validas");
      return;
    }

    setValue("latitude", lat.toFixed(6), { shouldValidate: true, shouldDirty: true });
    setValue("longitude", lng.toFixed(6), { shouldValidate: true, shouldDirty: true });
    setLocationLabel(result.display_name || "");

    const detectedCity = result.address?.city || result.address?.town || result.address?.village || "";
    const detectedProvince = result.address?.state || "";
    const detectedAddress = [result.address?.road, result.address?.house_number, result.address?.suburb]
      .filter(Boolean)
      .join(" ");

    if (detectedCity) setValue("city", detectedCity, { shouldDirty: true });
    if (detectedProvince) setValue("province", detectedProvince, { shouldDirty: true });
    if (detectedAddress) setValue("address", detectedAddress, { shouldDirty: true });

    setSearchResults([]);
    toast.success("Ubicacion seleccionada");
  };

  const handleSearchCoordinates = async () => {
    const address = watch("address")?.trim() || "";
    const city = watch("city")?.trim() || "";
    const province = watch("province")?.trim() || "";
    const fallbackQuery = [address, city, province, "Paraguay"].filter(Boolean).join(", ");
    const query = locationQuery.trim() || fallbackQuery;

    if (!query) {
      toast.error("Ingresa direccion, barrio o ciudad para buscar");
      return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=py&q=${encodeURIComponent(query)}`;

    setIsSearchingLocation(true);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("No se pudo consultar ubicacion");

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchResults([]);
        toast.error("No encontramos ubicaciones con esos datos");
        return;
      }

      setSearchResults(data as NominatimResult[]);
      toast.success("Selecciona una opcion");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo buscar la ubicacion");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalizacion");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setValue("latitude", lat.toFixed(6), { shouldValidate: true, shouldDirty: true });
        setValue("longitude", lng.toFixed(6), { shouldValidate: true, shouldDirty: true });
        setLocationLabel("Ubicacion actual del dispositivo");
        reverseGeocode(lat, lng);
        toast.success("Ubicacion actual aplicada");
      },
      () => toast.error("No se pudo obtener tu ubicacion actual"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!open) return;

    setActiveTab("data");
    setSearchResults([]);
    setLocationQuery("");
    setLocationLabel("");

    if (client) {
      reset({
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        email: client.email || "",
        phone: client.phone || "",
        dni: client.dni || "",
        birth_date: client.birth_date || "",
        address: client.address || "",
        city: client.city || "",
        province: client.province || "",
        latitude: client.latitude?.toString() || "",
        longitude: client.longitude?.toString() || "",
      });
      return;
    }

    reset({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      dni: "",
      birth_date: "",
      address: "",
      city: "",
      province: "",
      latitude: "",
      longitude: "",
    });
  }, [client, open, reset]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      const latitude = parseCoordinate(data.latitude, -90, 90, "Latitud");
      const longitude = parseCoordinate(data.longitude, -180, 180, "Longitud");

      if ((latitude === null) !== (longitude === null)) {
        throw new Error("Debes cargar latitud y longitud juntas");
      }

      const payload = { ...data, latitude, longitude };

      if (isEditing && client) {
        await updateClient.mutateAsync({ id: client.id, ...payload });
      } else {
        await createClient.mutateAsync({ ...payload, company_id: profile?.company_id || undefined });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving client:", error);
      toast.error(error?.message || "No se pudo guardar el cliente");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Crear Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data">Datos</TabsTrigger>
              <TabsTrigger value="location">Ubicacion</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input id="first_name" {...register("first_name", { required: "El nombre es requerido" })} />
                  {errors.first_name && <span className="text-xs text-destructive">{errors.first_name.message}</span>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input id="last_name" {...register("last_name", { required: "El apellido es requerido" })} />
                  {errors.last_name && <span className="text-xs text-destructive">{errors.last_name.message}</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dni">DNI/CI</Label>
                  <Input id="dni" {...register("dni")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                <Input id="birth_date" type="date" {...register("birth_date")} />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="province">Provincia</Label>
                  <Input id="province" {...register("province")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Direccion</Label>
                <Input id="address" placeholder="Ej: Boqueron 123" {...register("address")} />
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Buscar en mapa (direccion, barrio, ciudad)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchCoordinates();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleSearchCoordinates} disabled={isSearchingLocation}>
                    {isSearchingLocation ? "..." : "Buscar"}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleUseCurrentLocation}>
                    Usar mi ubicacion
                  </Button>
                  {hasValidCoords && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setValue("latitude", "", { shouldDirty: true });
                        setValue("longitude", "", { shouldDirty: true });
                        setLocationLabel("");
                      }}
                    >
                      Limpiar punto
                    </Button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-28 overflow-y-auto rounded border">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.lat}-${result.lon}-${index}`}
                        type="button"
                        onClick={() => selectLocationResult(result)}
                        className="w-full border-b px-3 py-2 text-left text-xs hover:bg-muted last:border-b-0"
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="latitude">Latitud</Label>
                    <Input id="latitude" placeholder="-25.300660" {...register("latitude")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="longitude">Longitud</Label>
                    <Input id="longitude" placeholder="-57.635910" {...register("longitude")} />
                  </div>
                </div>

                <LocationPickerMap
                  latitude={mapLat}
                  longitude={mapLng}
                  onLocationSelect={handleMapLocationSelect}
                  className="h-56 w-full"
                />

                <p className="text-xs text-muted-foreground truncate">
                  {locationLabel || (hasValidCoords ? "Punto cargado - arrastra el marcador para ajustar" : "Haz click en el mapa para seleccionar ubicacion")}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
              {createClient.isPending || updateClient.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
