import React from 'react'

function CategoryCard({name,image,onClick}) {
  return (
    <div className='w-[120px] h-[120px] md:w-[180px] md:h-[180px] rounded-2xl border-2 border-[#ff4d2d] shrink-0 overflow-hidden bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out relative group cursor-pointer' onClick={onClick}>
     <img src={image} alt="" className='w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-in-out'/>
     <div className='absolute bottom-0 w-full left-0 bg-[#ffffff96] bg-opacity-95 px-3 py-1 rounded-t-xl text-center shadow text-sm font-medium text-gray-800 backdrop-blur group-hover:text-[#ff4d2d] transition-colors duration-300'>
{name}
     </div>
    </div>
  )
}

export default CategoryCard
