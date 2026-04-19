import React, { useMemo, useState } from 'react';

const ClubMembersTab = ({
  members,
  membersLoading,
  membersError,
  calculateYear,
  memberActionError,
  memberActionSuccess,
  onOpenAddMember,
  onRemoveMember,
  addMemberOpen,
  onCloseAddMember,
  memberSearch,
  setMemberSearch,
  memberDepartmentFilter,
  setMemberDepartmentFilter,
  memberYearFilter,
  setMemberYearFilter,
  studentResults,
  studentsLoading,
  studentsError,
  onAddMember,
  memberDepartmentOptions,
  studentYearOptions,
}) => {
  const [memberQuery, setMemberQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const normalized = memberQuery.trim().toLowerCase();
    if (!normalized) return members;

    return members.filter((member) =>
      [member.name, member.email, member.department, member.register_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [members, memberQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Club Members</h1>
          <p className="mt-1 text-text-secondary dark:text-text-dark-secondary">Students currently part of your club.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border-subtle bg-white px-4 py-3 dark:border-border-strong dark:bg-[#1a2632]">
            <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-text-dark-secondary">Total Members</p>
            <p className="mt-1 text-2xl font-bold">{members.length}</p>
          </div>
          <button
            type="button"
            onClick={onOpenAddMember}
            className="touch-target inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Member
          </button>
        </div>
      </div>

      <label className="mb-4 flex h-10 max-w-md items-stretch rounded-xl bg-surface-muted dark:bg-border-strong">
        <div className="flex items-center justify-center pl-3">
          <span className="material-symbols-outlined text-[18px] text-text-secondary">search</span>
        </div>
        <input
          value={memberQuery}
          onChange={(event) => setMemberQuery(event.target.value)}
          placeholder="Search members"
          className="w-full flex-1 border-none bg-transparent px-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none dark:text-white"
        />
      </label>

      {membersError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{membersError}</p>
      )}
      {memberActionError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{memberActionError}</p>
      )}
      {memberActionSuccess && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{memberActionSuccess}</p>
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-white dark:border-border-strong dark:bg-[#1a2632]">
        {membersLoading ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">Loading club members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">No members match your search.</div>
        ) : (
          <table className="w-full min-w-184 table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[26%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-subtle dark:border-border-strong">
                {['Student', 'Email', 'Department', 'Year', 'Register No', 'Actions'].map((header) => (
                  <th key={header} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-dark-secondary">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const memberInitial = (member.name || member.email || '?').charAt(0).toUpperCase();

                return (
                  <tr key={member.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/50">
                    <td className="px-5 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        {member.picture ? (
                          <img src={member.picture} alt={member.name || 'Member'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{memberInitial}</div>
                        )}
                        <span className="block truncate text-sm font-semibold" title={member.name || 'Unnamed student'}>{member.name || 'Unnamed student'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                      <span className="block truncate" title={member.email || '-'}>{member.email || '-'}</span>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm">{member.department || '-'}</td>
                    <td className="px-5 py-4 align-middle text-sm">{calculateYear(member.batch, member.degree, member.register_number)}</td>
                    <td className="px-5 py-4 align-middle text-sm">
                      <span className="block truncate" title={member.register_number || '-'}>{member.register_number || '-'}</span>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <button
                        type="button"
                        onClick={() => onRemoveMember(member)}
                        className="rounded-lg border border-red-500/25 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCloseAddMember}>
          <div
            className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-2xl dark:border-border-strong dark:bg-[#1a2632]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 dark:border-border-strong">
              <div>
                <h2 className="text-lg font-bold">Add Club Member</h2>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-text-dark-secondary">Search registered WAVC students. Filter by department and year.</p>
              </div>
              <button
                type="button"
                onClick={onCloseAddMember}
                className="touch-target flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted dark:text-text-dark-secondary dark:hover:bg-border-strong"
                aria-label="Close add member dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 border-b border-border-subtle px-5 py-4 dark:border-border-strong">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <label className="flex h-10 items-center rounded-xl bg-surface-muted dark:bg-border-strong">
                  <span className="material-symbols-outlined px-3 text-[18px] text-text-secondary">search</span>
                  <input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search by name, email, register no"
                    className="w-full border-none bg-transparent pr-3 text-sm focus:outline-none dark:text-white"
                  />
                </label>

                <select
                  value={memberDepartmentFilter}
                  onChange={(event) => setMemberDepartmentFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All departments</option>
                  {memberDepartmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>

                <select
                  value={memberYearFilter}
                  onChange={(event) => setMemberYearFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All years</option>
                  {studentYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {studentsError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{studentsError}</p>
              )}
            </div>

            <div className="max-h-[52vh] overflow-auto px-5 py-4">
              {studentsLoading ? (
                <div className="py-10 text-center text-sm text-text-secondary dark:text-text-dark-secondary">Loading registered students...</div>
              ) : studentResults.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-secondary dark:text-text-dark-secondary">No students found for current filters.</div>
              ) : (
                <table className="w-full min-w-176 table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[26%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border-subtle dark:border-border-strong">
                      {['Student', 'Email', 'Department', 'Year', 'Register No', 'Add'].map((header) => (
                        <th key={header} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-dark-secondary">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((student) => {
                      const studentInitial = (student.name || student.email || '?').charAt(0).toUpperCase();

                      return (
                        <tr key={student.id} className="border-b border-border-subtle dark:border-border-strong">
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-3">
                              {student.picture ? (
                                <img src={student.picture} alt={student.name || 'Student'} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{studentInitial}</div>
                              )}
                              <span className="truncate text-sm font-medium" title={student.name || 'Unnamed student'}>{student.name || 'Unnamed student'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                            <span className="block truncate" title={student.email || '-'}>{student.email || '-'}</span>
                          </td>
                          <td className="px-4 py-3 align-middle text-sm">{student.department || '-'}</td>
                          <td className="px-4 py-3 align-middle text-sm">{student.year || '-'}</td>
                          <td className="px-4 py-3 align-middle text-sm">
                            <span className="block truncate" title={student.register_number || '-'}>{student.register_number || '-'}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <button
                              type="button"
                              onClick={() => onAddMember(student.id)}
                              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubMembersTab;
