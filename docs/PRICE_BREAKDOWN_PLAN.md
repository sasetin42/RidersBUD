# Plan: PriceBreakdownModal Layout & Design Enhancements

This document outlines the detailed implementation plan to enhance the `PriceBreakdownModal` in [AdminBookingsScreen.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/RIDERSBUD%20APP/RidersBUD%20App/pages/admin/AdminBookingsScreen.tsx). The goal is to optimize header space, display inline service images with icon fallbacks, introduce side-by-side GCash receipt cards, and add clear visual sectioning.

---

## 1. Custom Title Header
To optimize vertical space and add status tracking visibility, we will customize the `title` prop on the `<Modal>` component. The `Modal` component supports a `React.ReactNode` for its title, which we will use to render a smaller header with a tracking subtitle.

### Proposed Changes:
*   Pass a custom `ReactNode` to the `title` prop:
    ```tsx
    <Modal
        title={
            <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                    Price Breakdown
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-gray-300">
                        #{booking.id.slice(-6).toUpperCase()}
                    </span>
                </h2>
                <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mt-0.5">
                    Booking Status: {booking.status}
                </span>
            </div>
        }
        isOpen={true}
        onClose={onClose}
    >
    ```

---

## 2. Service Thumbnail Images with Fallback
We will render service thumbnail images directly within the list of "Original Services". If a service doesn't have an image, it will display a fallback wrench icon.

### Proposed Changes:
*   Modify the service mapping inside `PriceBreakdownModal`:
    *   Add a container on the left of each service listing.
    *   Verify if `svc.imageUrl` is present. If it is, display it inside an `<img />` tag.
    *   If no image is found, render a fallback placeholder container displaying a `Wrench` icon.
*   **Proposed JSX Layout:**
    ```tsx
    {svcs.map((svc, idx) => (
        <div key={idx} className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg border border-white/5 text-xs">
            <div className="flex items-center gap-3">
                {svc.imageUrl ? (
                    <img 
                        src={svc.imageUrl} 
                        alt={svc.name} 
                        className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 text-gray-500 shrink-0">
                        <Wrench size={14} />
                    </div>
                )}
                <span className="text-gray-300 font-bold">{svc.name}</span>
            </div>
            <span className="text-white font-mono">₱{svc.price.toLocaleString()}</span>
        </div>
    ))}
    ```

---

## 3. Dedicated GCash Receipts Display
We will add a dedicated card section for displaying payment receipts side-by-side if the booking was paid via GCash.

### Proposed Changes:
*   Add a visual block checking if `booking.paymentMethod === 'GCash'`.
*   Render a side-by-side grid containing two interactive image/link cards:
    *   **Downpayment 50%:** Show receipt image from `booking.gcashDownpaymentReceiptUrl`. If not present, show a placeholder state ("No Receipt Uploaded"). Display the reference code from `booking.gcashDownpaymentReference`.
    *   **Final Payment:** Show receipt image from `booking.gcashBalanceReceiptUrl` (or fallback `booking.gcashReceiptUrl`). If not present, show a placeholder state ("No Receipt Uploaded"). Display the reference code from `booking.gcashBalanceReference`.
*   **Proposed JSX Layout:**
    ```tsx
    {booking.paymentMethod === 'GCash' && (
        <div className="space-y-2 border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                GCash Payment Receipts
            </h4>
            <div className="grid grid-cols-2 gap-3.5">
                {/* Downpayment Card */}
                <div className="border border-white/5 bg-[#121212] rounded-lg p-2.5 flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold">Downpayment (50%)</span>
                    {booking.gcashDownpaymentReceiptUrl ? (
                        <a 
                            href={booking.gcashDownpaymentReceiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="group relative w-full aspect-video rounded bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center"
                        >
                            <img 
                                src={booking.gcashDownpaymentReceiptUrl} 
                                alt="Downpayment Receipt" 
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white">
                                View Full Image
                            </div>
                        </a>
                    ) : (
                        <div className="w-full aspect-video rounded bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-gray-600 font-bold">Awaiting Upload</span>
                        </div>
                    )}
                    {booking.gcashDownpaymentReference && (
                        <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded select-all">
                            Ref: {booking.gcashDownpaymentReference}
                        </span>
                    )}
                </div>

                {/* Final Payment Card */}
                <div className="border border-white/5 bg-[#121212] rounded-lg p-2.5 flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold">Final Payment</span>
                    {booking.gcashBalanceReceiptUrl || booking.gcashReceiptUrl ? (
                        <a 
                            href={booking.gcashBalanceReceiptUrl || booking.gcashReceiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="group relative w-full aspect-video rounded bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center"
                        >
                            <img 
                                src={booking.gcashBalanceReceiptUrl || booking.gcashReceiptUrl} 
                                alt="Final Payment Receipt" 
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-bold text-white">
                                View Full Image
                            </div>
                        </a>
                    ) : (
                        <div className="w-full aspect-video rounded bg-[#181818] border border-dashed border-white/10 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-gray-600 font-bold">Awaiting Upload</span>
                        </div>
                    )}
                    {(booking.gcashBalanceReference || booking.gcashReference) && (
                        <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded select-all">
                            Ref: {booking.gcashBalanceReference || booking.gcashReference}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )}
    ```

---

## 4. Styled Dividers & Visual Boundaries
To present the pricing layout cleanly to the admins, we will structure the sections with explicit container boundaries and border lines instead of a single contiguous block of content.

### Proposed Changes:
*   Wrap the **Original Services** block in a bordered container:
    `border border-white/5 bg-white/[0.01] rounded-xl p-3.5`
*   Wrap the **Additional Costs** block in a bordered container:
    `border border-white/5 bg-white/[0.01] rounded-xl p-3.5`
*   Separate the major sections (Original Services, Additional Costs, GCash Receipts, and Totals Summary) using clean dividers:
    `<div className="h-px bg-white/10 my-4" />`
*   Clean up vertical spacing inside the main wrapper `div` to ensure sections flow naturally and are easily readable.
