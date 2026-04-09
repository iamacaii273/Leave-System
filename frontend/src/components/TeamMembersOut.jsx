export default function TeamMembersOut({ teamOut = [] }) {
  return (
    <div className="bg-[#f0f4fb] rounded-[36px] p-8">
      <h3 className="font-bold text-[20px] font-fredoka text-[#3d4551] mb-6 tracking-wide">Team Members Out</h3>
      {teamOut.length === 0 ? (
        <p className="text-[#64748b] font-medium text-[15px]">The whole team is present today!</p>
      ) : (
        <>
          <div className="flex -space-x-2 mb-8">
            {teamOut.slice(0, 3).map((r, i) => (
              <div 
                key={i} 
                className="w-[46px] h-[46px] flex items-center justify-center font-bold text-white rounded-full border-2 border-[#f0f4fb]" 
                style={{ zIndex: 10 - i, backgroundColor: i % 2 === 0 ? '#1982c4' : '#d06ab0' }}
                title={r.full_name}
              >
                {r.full_name?.charAt(0) || 'U'}
              </div>
            ))}
            {teamOut.length > 3 && (
              <div className="w-[46px] h-[46px] rounded-full border-2 border-[#f0f4fb] bg-[#e4e9f2] text-[#64748b] flex items-center justify-center font-bold text-sm" style={{ zIndex: 1 }}>
                +{teamOut.length - 3}
              </div>
            )}
          </div>
          <p className="text-[#64748b] font-medium text-[15px]">Enjoying their time off today!</p>
        </>
      )}
    </div>
  )
}
