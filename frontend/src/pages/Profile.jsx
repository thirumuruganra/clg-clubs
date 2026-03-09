import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Profile = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const userId = searchParams.get('user_id');
  const name = searchParams.get('name') || 'Student';
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const picture = searchParams.get('picture');
  const role = searchParams.get('role') || 'STUDENT';
  const isIncomplete = searchParams.get('incomplete_profile') === 'true';

  const [formData, setFormData] = useState({
    batch: '',
    department: '',
    joined_clubs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
       fetch(`/api/users/${userId}`)
         .then(res => res.json())
         .then(data => {
            setFormData({
                batch: data.batch || '',
                department: data.department || '',
                joined_clubs: data.joined_clubs || []
            });
            if (data.email) {
                setEmail(data.email);
            }
            setLoading(false);
         })
         .catch(err => {
             console.error("Error fetching user data:", err);
             setLoading(false);
         });
    } else {
        setLoading(false);
    }
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('incomplete_profile');
            // Update params to reflect potentially changed data if passed around (though Dashboard should probably fetch data itself)
            newParams.set('batch', formData.batch);
            newParams.set('department', formData.department);
            
            navigate(`/dashboard?${newParams.toString()}`);
        } else {
            alert("Failed to save profile. Please try again.");
        }
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("An error occurred while saving.");
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
              <div className="animate-pulse">Loading profile...</div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1a2632] rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        
        {/* Header/Banner Area */}
        <div className="bg-primary h-32 relative">
            <div className="absolute top-4 left-4">
                <button 
                    onClick={() => navigate(`/dashboard?${searchParams.toString()}`)} 
                    className="flex items-center gap-1 text-white/80 hover:text-white transition-colors bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm text-sm font-medium"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to Dashboard
                </button>
            </div>
            <div className="absolute -bottom-16 left-8">
                {picture ? (
                    <img src={picture} alt={name} className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a2632] object-cover shadow-lg" />
                ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white dark:border-[#1a2632] bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary bg-white dark:bg-[#111a22] shadow-lg">
                        {name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </div>
        
        <div className="pt-20 px-8 pb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
                <h1 className="text-3xl font-bold text-[#111418] dark:text-white mb-1">
                    {isIncomplete ? "Complete Your Profile" : "Edit Profile"}
                </h1>
                <p className="text-[#637588] dark:text-[#92adc9]">{email}</p>
            </div>
            {!isIncomplete && (
                 <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                     {role}
                 </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#111418] dark:text-white">Full Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        disabled 
                        className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#111418] dark:text-white">Email Address</label>
                    <input 
                        type="text" 
                        value={email} 
                        disabled 
                        className="w-full px-4 py-2 rounded-xl bg-[#f0f2f4] dark:bg-[#233648] border-none text-[#637588] dark:text-[#92adc9] opacity-70 cursor-not-allowed" 
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#111418] dark:text-white">
                        Batch / Year <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        name="batch" 
                        value={formData.batch} 
                        onChange={handleChange} 
                        required 
                        placeholder="e.g. 2024"
                        className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-[#111418] dark:text-white">
                        Department <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        name="department" 
                        value={formData.department} 
                        onChange={handleChange} 
                        required 
                        placeholder="e.g. CSE"
                        className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-medium text-[#111418] dark:text-white">Joined Clubs</label>
                
                {/* Chips for joined clubs */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {formData.joined_clubs.map((club) => (
                        <span key={club} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                            {club}
                            <button 
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        joined_clubs: prev.joined_clubs.filter(c => c !== club)
                                    }));
                                }}
                                className="ml-2 hover:text-red-500 focus:outline-none"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </span>
                    ))}
                    {formData.joined_clubs.length === 0 && (
                        <span className="text-sm text-[#637588] dark:text-[#92adc9] italic">No clubs joined yet</span>
                    )}
                </div>

                {/* Dropdown to add clubs */}
                <div className="relative">
                    <select 
                        onChange={(e) => {
                            const selectedClub = e.target.value;
                            if (selectedClub && !formData.joined_clubs.includes(selectedClub)) {
                                setFormData(prev => ({
                                    ...prev,
                                    joined_clubs: [...prev.joined_clubs, selectedClub]
                                }));
                            }
                            e.target.value = ""; // Reset select
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all appearance-none"
                    >
                        <option value="">Select a club to join...</option>
                        {/* Mocking some clubs just so the UI makes sense in dev, 
                            though requirement says "currently empty". 
                            I'll leave it empty to respect the requirement strictly, 
                            or add a comment that this is where they would go.
                         */}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[#637588]">
                        <span className="material-symbols-outlined">expand_more</span>
                    </div>
                </div>
                <p className="text-xs text-[#637588] dark:text-[#92adc9] mt-1 pl-1">
                    Select clubs from the list to join them.
                </p>
            </div>

            <div className="flex justify-end pt-6 border-t border-[#e5e7eb] dark:border-[#233648] mt-6">
                <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 active:scale-95 transform duration-100"
                >
                    {isIncomplete ? "Complete Setup & Continue" : "Save Changes"}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
