export default function TeamMembersOut() {
  const avatars = [
    "https://i.pravatar.cc/150?img=11",
    "https://i.pravatar.cc/150?img=12",
    "https://i.pravatar.cc/150?img=13",
  ];

  return (
    <div className="bg-[#f0f4fb] rounded-[36px] p-8">
      <h3 className="font-bold text-[20px] font-fredoka text-[#3d4551] mb-6 tracking-wide">Team Members Out</h3>
      <div className="flex -space-x-2 mb-8">
        {avatars.map((src, i) => (
          <img key={i} src={src} className="w-[46px] h-[46px] rounded-full border-2 border-[#f0f4fb]" alt="avatar" style={{ zIndex: 10 - i }} />
        ))}
        <div className="w-[46px] h-[46px] rounded-full border-2 border-[#f0f4fb] bg-[#e4e9f2] text-[#64748b] flex items-center justify-center font-bold text-sm" style={{ zIndex: 1 }}>
          +2
        </div>
      </div>
      <p className="text-[#64748b] font-medium text-[15px]">Enjoying their time off today!</p>
    </div>
  )
}
