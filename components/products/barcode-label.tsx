'use client'

import Barcode from 'react-barcode'

interface BarcodeLabelProps {
  name: string
  price: number
  barcode: string
  shopName?: string
}

export function BarcodeLabel({ name, price, barcode, shopName }: BarcodeLabelProps) {
  return (
    <div className="w-[38mm] h-[25mm] p-1 flex flex-col items-center justify-center bg-white text-black border border-gray-100">
      {shopName && <div className="text-[8px] font-bold uppercase truncate w-full text-center">{shopName}</div>}
      <div className="text-[9px] font-medium truncate w-full text-center">{name}</div>
      <div className="my-0.5 scale-75 origin-center">
        <Barcode 
          value={barcode} 
          width={1.2} 
          height={30} 
          fontSize={10} 
          margin={0}
          displayValue={true}
        />
      </div>
      <div className="text-[10px] font-bold">MRP: ₹{price.toFixed(2)}</div>
    </div>
  )
}
