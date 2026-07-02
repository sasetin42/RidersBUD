# Implementation Plan: Special Services Fields and Compact Modals

This plan outlines the enhancements to be made to the catalog management system in [AdminCatalogScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminCatalogScreen.tsx).

---

## 1. Objectives

1.  **Compact Modals**: Set the `compact={true}` prop on both the Service and Part add/edit modals in `AdminCatalogScreen.tsx` to reduce header/footer padding and enhance content density.
2.  **Form Data Expansion**: Extend the `formData` state in `ServiceForm` to support the new booking rules fields:
    *   `requiresDownpayment` (boolean)
    *   `downpaymentPercentage` (number/string)
    *   `requiresApproval` (boolean)
    *   `bookingNoticeHours` (number/string)
3.  **Checkbox/Toggle Handling**: Update `handleChange` to support checkboxes and boolean fields correctly using `checked` or custom event handling.
4.  **Special Booking Panel**: Add a conditional UI panel inside `ServiceForm` that is displayed **only** when the selected category is `"SPECIAL Services"`. This panel will provide inputs for configuring:
    *   **Requires Approval** (Toggle/Checkbox switch)
    *   **Requires Downpayment** (Toggle/Checkbox switch)
    *   **Downpayment Percentage** (Numeric input, visible/enabled only if downpayment is required)
    *   **Booking Notice (Hours)** (Numeric input)

---

## 2. Proposed Changes

### A. Compact Modals in `AdminCatalogScreen.tsx`

We will modify the modal instantiations at the bottom of the main render method of `AdminCatalogScreen` (around lines 1841-1846):

```diff
-            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal}>
+            <Modal title={editingService ? 'Edit Service' : 'Add Service'} isOpen={isServiceModalOpen} onClose={handleCloseServiceModal} compact={true}>
                 <ServiceForm service={editingService} onSave={handleSaveService} onCancel={handleCloseServiceModal} categories={(db?.settings?.serviceCategories || []).filter(c => c !== 'all')} />
             </Modal>
-            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal}>
+            <Modal title={editingPart ? 'Edit Part' : 'Add Part'} isOpen={isPartModalOpen} onClose={handleClosePartModal} compact={true}>
                 <PartForm part={editingPart} onSave={handleSavePart} onCancel={handleClosePartModal} categories={(db?.settings?.partCategories || []).filter(c => c !== 'all')} />
             </Modal>
```

---

### B. `ServiceForm` State and Handlers Update

1.  **State Initialization**:
    Initialize fields in `formData` (around lines 343-352) with defaults from the existing `service` object or logical defaults:
    ```typescript
    const [formData, setFormData] = useState({
        id: service?.id,
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price ?? '',
        estimatedTime: service?.estimatedTime || '',
        category: service?.category || (activeCategories[0] || ''),
        imageUrl: service?.imageUrl || '',
        icon: service?.icon || '',
        // New fields
        requiresDownpayment: service?.requiresDownpayment || false,
        downpaymentPercentage: service?.downpaymentPercentage ?? 10,
        requiresApproval: service?.requiresApproval || false,
        bookingNoticeHours: service?.bookingNoticeHours ?? 24,
    });
    ```

2.  **`handleChange` Updates**:
    Update the change handler to correctly check `e.target.type === 'checkbox'` and capture the boolean value `checked`, mapping it to the corresponding form field:
    ```typescript
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        const newData = { ...formData, [name]: val };
        setFormData(newData);
        if (errors[name]) validate(newData);
    };
    ```

3.  **Submission Map**:
    Ensure the properties are correctly typecasted (e.g. converting numeric values) in `handleSubmit` before passing them to `onSave`:
    ```typescript
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({
                ...formData,
                price: Number(formData.price),
                requiresDownpayment: formData.requiresDownpayment,
                downpaymentPercentage: formData.requiresDownpayment ? Number(formData.downpaymentPercentage) : undefined,
                requiresApproval: formData.requiresApproval,
                bookingNoticeHours: Number(formData.bookingNoticeHours),
            });
        }
    };
    ```

---

### C. UI Component: Special Booking Panel

We will add a dedicated section inside the `ServiceForm` render block that dynamically appears only when `formData.category === 'SPECIAL Services'`.

```jsx
{formData.category === 'SPECIAL Services' && (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4 animate-fadeIn">
        <h4 className="text-sm font-bold text-primary tracking-wider uppercase">Special Booking Rules</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Requires Approval */}
            <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                <div className="space-y-0.5">
                    <label htmlFor="requiresApproval" className="text-xs font-bold text-gray-300">Requires Approval</label>
                    <p className="text-[10px] text-gray-500">Booking needs admin review</p>
                </div>
                <input
                    id="requiresApproval"
                    type="checkbox"
                    name="requiresApproval"
                    checked={formData.requiresApproval}
                    onChange={handleChange}
                    className="w-4 h-4 accent-primary cursor-pointer rounded border-gray-600 bg-gray-700"
                />
            </div>

            {/* Requires Downpayment */}
            <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg">
                <div className="space-y-0.5">
                    <label htmlFor="requiresDownpayment" className="text-xs font-bold text-gray-300">Requires Downpayment</label>
                    <p className="text-[10px] text-gray-500">Deposit is required to secure slot</p>
                </div>
                <input
                    id="requiresDownpayment"
                    type="checkbox"
                    name="requiresDownpayment"
                    checked={formData.requiresDownpayment}
                    onChange={handleChange}
                    className="w-4 h-4 accent-primary cursor-pointer rounded border-gray-600 bg-gray-700"
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Downpayment Percentage */}
            <div className="space-y-2">
                <label htmlFor="downpaymentPercentage" className="text-xs font-bold text-gray-400">Downpayment %</label>
                <input
                    id="downpaymentPercentage"
                    type="number"
                    name="downpaymentPercentage"
                    value={formData.downpaymentPercentage}
                    onChange={handleChange}
                    disabled={!formData.requiresDownpayment}
                    placeholder="10"
                    min="1"
                    max="100"
                    className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
            </div>

            {/* Booking Notice Hours */}
            <div className="space-y-2">
                <label htmlFor="bookingNoticeHours" className="text-xs font-bold text-gray-400">Min. Notice (Hours)</label>
                <input
                    id="bookingNoticeHours"
                    type="number"
                    name="bookingNoticeHours"
                    value={formData.bookingNoticeHours}
                    onChange={handleChange}
                    placeholder="24"
                    min="0"
                    className="w-full py-2 px-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
            </div>
        </div>
    </div>
)}
```

---

## 3. Verification Plan

1.  **UI Testing**:
    *   Verify both Modals open in compact style.
    *   Verify selecting `SPECIAL Services` displays the special rules panel.
    *   Verify selecting any other category hides the special rules panel.
    *   Verify checking/unchecking boxes updates state immediately.
    *   Verify downpayment percentage input enables/disables correctly based on the toggle.
2.  **Functional Testing**:
    *   Verify saving a service with category `SPECIAL Services` updates the DB correctly with the configured fields (`requiresApproval`, `requiresDownpayment`, `downpaymentPercentage`, `bookingNoticeHours`).
