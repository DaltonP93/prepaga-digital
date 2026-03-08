
## Plan: Add phone field to the Adherentes tab in the sale form

### Problem
The `SaleAdherentsTab` component has `phone` in its state (line 33) but doesn't render a phone input field in the form UI. The phone number is critical because it's used as `recipient_phone` in `signature_links` for sending the DDJJ signature link via WhatsApp to adherentes.

### Change

**File: `src/components/sale-form/SaleAdherentsTab.tsx`**

Add a phone input field with the `+595` visual prefix (matching the client form pattern) in the form grid, between the "Fecha de Nacimiento" and "Monto" fields. The field will:

- Show a `+595` prefix label for consistency with the phone normalization system
- Store the number without the country code prefix (matching existing `normalizePhone` behavior)
- Display as "Teléfono *" to indicate it's important for the signature flow

Also display the phone in the beneficiary list card so it's visible after saving.

### Layout after change

The form grid will have these fields in order:
1. Nombre* / Apellido*
2. C.I. / Parentesco
3. Fecha de Nacimiento / **Teléfono** (new)
4. Monto / Domicilio
5. Barrio / Ciudad
