import React from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CartItemCard from '../components/CartItemCard';
import CartCrossSell from '../components/CartCrossSell';
function CartPage() {
    const navigate = useNavigate()
    const { cartItems, totalAmount } = useSelector(state => state.user)
    return (
        <div className='min-h-screen bg-[#fff9f6] flex justify-center p-3 sm:p-6 pb-28 md:pb-12'>
            <div className='w-full max-w-[800px]'>
                <div className='flex items-center gap-3 sm:gap-5 mb-6'>
                    <div className='z-[10] cursor-pointer' onClick={() => navigate("/")}>
                        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
                    </div>
                    <h1 className='text-2xl font-bold text-stone-900'>Your Cart</h1>
                </div>
                {cartItems?.length == 0 ? (
                    <p className='text-gray-500 text-lg text-center'>Your Cart is Empty</p>
                ) : (<>
                    <div className='space-y-4'>
                        {cartItems?.map((item, index) => (
                            <CartItemCard data={item} key={item.id || item._id || index} />
                        ))}
                    </div>
                    <CartCrossSell />
                    <div className='mt-6 bg-white p-4 rounded-xl shadow flex justify-between items-center border'>

                        <h1 className='text-lg font-semibold'>Total Amount</h1>
                        <span className='text-xl font-bold text-[#ff4d2d]'>₹{totalAmount}</span>
                    </div>
                    <div className='mt-4 flex justify-end'> 
                        <button className='w-full sm:w-auto bg-[#ff4d2d] text-white px-6 py-3 rounded-xl text-base sm:text-lg font-bold hover:bg-[#e64526] transition cursor-pointer shadow-md text-center' onClick={()=>navigate("/checkout")}>Proceed to CheckOut</button>
                    </div>
                </>
                )}
            </div>
        </div>
    )
}

export default CartPage
