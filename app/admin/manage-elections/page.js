"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Toaster, toast } from "sonner";
import {
  FaSpinner,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSearch,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaFileExcel,
  FaTimes,
  FaUniversity,
  FaPlay,
  FaStop,
  FaLayerGroup,
  FaSun,
  FaMoon,
  FaHourglassHalf,
  FaCalendarCheck,
} from "react-icons/fa";
import * as XLSX from "xlsx";

export default function ManageElections() {
  const { admin, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [filteredElections, setFilteredElections] = useState([]);
  const [votingPeriods, setVotingPeriods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingElection, setEditingElection] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [theme, setTheme] = useState("light");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    voting_period_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    election_year: new Date().getFullYear(),
    is_active: false,
    is_archived: false,
  });
  const [positionForm, setPositionForm] = useState({
    title: "",
    description: "",
    order_number: 999,
    max_votes: 1,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    upcoming: 0,
    expired: 0,
  });
  const router = useRouter();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("adminTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Access denied. Admin privileges required.");
      router.push("/");
    } else if (isAuthenticated) {
      fetchVotingPeriods();
      fetchElections();
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchVotingPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("voting_periods")
        .select("id, title, start_date, end_date, is_active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVotingPeriods(data || []);
    } catch (error) {
      console.error("Error fetching voting periods:", error);
      toast.error("Failed to load voting periods");
    }
  };

  const fetchElections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("elections")
        .select(
          `
          *,
          voting_periods(title),
          positions(count)
        `,
        )
        .order("election_year", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const validElections = (data || []).filter(
        (e) =>
          e.title &&
          e.title !== "src2026" &&
          e.title !== "sorth" &&
          !e.title.includes("src"),
      );

      setElections(validElections);
      setFilteredElections(validElections);

      const now = new Date();
      
      // Calculate stats based on actual date/time
      let active = 0;
      let completed = 0;
      let upcoming = 0;
      let expired = 0;

      validElections.forEach((e) => {
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        
        if (e.is_active === true) {
          active++;
        } else if (end < now) {
          completed++;
        } else if (start > now) {
          upcoming++;
        }
        
        // Check for expired (ended but not marked as inactive)
        if (end < now && e.is_active === true) {
          expired++;
        }
      });

      setStats({ 
        total: validElections.length, 
        active, 
        completed, 
        upcoming,
        expired 
      });
    } catch (error) {
      console.error("Error fetching elections:", error);
      toast.error("Failed to load elections");
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async (electionId) => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .eq("election_id", electionId)
        .order("order_number", { ascending: true });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to load positions");
    }
  };

  const handleManagePositions = async (election) => {
    setSelectedElection(election);
    await fetchPositions(election.id);
    setShowPositionsModal(true);
  };

  const handleAddPosition = async () => {
    if (!positionForm.title.trim()) {
      toast.error("Position title is required");
      return;
    }

    setSubmitting(true);
    try {
      const positionData = {
        election_id: selectedElection.id,
        title: positionForm.title.trim(),
        description: positionForm.description || null,
        order_number: positionForm.order_number,
        max_votes: positionForm.max_votes,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("positions").insert([positionData]);
      if (error) throw error;

      toast.success("Position added successfully!");
      setPositionForm({
        title: "",
        description: "",
        order_number: 999,
        max_votes: 1,
      });
      await fetchPositions(selectedElection.id);
    } catch (error) {
      console.error("Error adding position:", error);
      toast.error("Failed to add position");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePosition = async () => {
    if (!positionForm.title.trim()) {
      toast.error("Position title is required");
      return;
    }

    setSubmitting(true);
    try {
      const positionData = {
        title: positionForm.title.trim(),
        description: positionForm.description || null,
        order_number: positionForm.order_number,
        max_votes: positionForm.max_votes,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("positions")
        .update(positionData)
        .eq("id", editingPosition.id);

      if (error) throw error;

      toast.success("Position updated successfully!");
      setEditingPosition(null);
      setPositionForm({
        title: "",
        description: "",
        order_number: 999,
        max_votes: 1,
      });
      await fetchPositions(selectedElection.id);
    } catch (error) {
      console.error("Error updating position:", error);
      toast.error("Failed to update position");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePosition = async (positionId) => {
    try {
      const { count, error: candidateCheck } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("position_id", positionId);

      if (candidateCheck) throw candidateCheck;

      if (count && count > 0) {
        toast.error("Cannot delete position with existing candidates");
        return;
      }

      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", positionId);
      if (error) throw error;

      toast.success("Position deleted successfully");
      await fetchPositions(selectedElection.id);
    } catch (error) {
      console.error("Error deleting position:", error);
      toast.error("Failed to delete position");
    }
  };

  const editPosition = (position) => {
    setEditingPosition(position);
    setPositionForm({
      title: position.title,
      description: position.description || "",
      order_number: position.order_number || 999,
      max_votes: position.max_votes || 1,
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = "Title is required";
    if (!formData.voting_period_id)
      errors.voting_period_id = "Please select a voting period";
    if (!formData.start_date) errors.start_date = "Start date is required";
    if (!formData.start_time) errors.start_time = "Start time is required";
    if (!formData.end_date) errors.end_date = "End date is required";
    if (!formData.end_time) errors.end_time = "End time is required";

    if (
      formData.start_date &&
      formData.start_time &&
      formData.end_date &&
      formData.end_time
    ) {
      const startDateTime = new Date(
        `${formData.start_date}T${formData.start_time}`,
      );
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      if (startDateTime >= endDateTime) {
        errors.end_date = "End date/time must be after start date/time";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddElection = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const startDateTime = new Date(
        `${formData.start_date}T${formData.start_time}`,
      );
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      const electionData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        voting_period_id: formData.voting_period_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        election_year: parseInt(formData.election_year),
        is_active: formData.is_active,
        is_archived: false,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("elections").insert([electionData]);
      if (error) throw error;

      toast.success("Election created successfully!");
      setShowAddModal(false);
      resetForm();
      fetchElections();
    } catch (error) {
      console.error("Error adding election:", error);
      toast.error(`Failed to create election: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateElection = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const startDateTime = new Date(
        `${formData.start_date}T${formData.start_time}`,
      );
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);

      const electionData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        voting_period_id: formData.voting_period_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        election_year: parseInt(formData.election_year),
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("elections")
        .update(electionData)
        .eq("id", editingElection.id);

      if (error) throw error;

      toast.success("Election updated successfully!");
      setShowAddModal(false);
      setEditingElection(null);
      resetForm();
      fetchElections();
    } catch (error) {
      console.error("Error updating election:", error);
      toast.error(`Failed to update election: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteElection = (election) => {
    toast.custom(
      (t) => (
        <div className={`rounded-lg shadow-lg p-4 max-w-sm w-full ${
          theme === "light" ? "bg-white" : "bg-gray-800"
        }`}>
          <div className="mb-4">
            <h3 className={`font-semibold ${
              theme === "light" ? "text-gray-900" : "text-white"
            }`}>
              Confirm Delete
            </h3>
            <p className={`text-sm mt-1 ${
              theme === "light" ? "text-gray-500" : "text-gray-400"
            }`}>
              Are you sure you want to delete{" "}
              <strong className="text-red-600">{election.title}</strong>?
              This action cannot be undone.
            </p>
            {election.is_active && (
              <p className="text-xs text-red-500 mt-2">
                ⚠️ Warning: This election is currently active. Deactivating it
                first is recommended.
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => toast.dismiss(t)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                theme === "light"
                  ? "bg-gray-200 hover:bg-gray-300"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                await handleDeleteElection(election.id);
              }}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  };

  const handleDeleteElection = async (electionId) => {
    try {
      const { data: positions, error: positionsCheck } = await supabase
        .from("positions")
        .select("id")
        .eq("election_id", electionId);

      if (positionsCheck) throw positionsCheck;

      if (positions && positions.length > 0) {
        for (const position of positions) {
          const { count, error: candidateCheck } = await supabase
            .from("candidates")
            .select("*", { count: "exact", head: true })
            .eq("position_id", position.id);

          if (candidateCheck) throw candidateCheck;

          if (count && count > 0) {
            toast.error("Cannot delete election with existing candidates");
            return;
          }
        }

        const { error: deletePositionsError } = await supabase
          .from("positions")
          .delete()
          .eq("election_id", electionId);

        if (deletePositionsError) throw deletePositionsError;
      }

      const { error } = await supabase
        .from("elections")
        .delete()
        .eq("id", electionId);
      if (error) throw error;

      toast.success("Election deleted successfully");
      fetchElections();
    } catch (error) {
      console.error("Error deleting election:", error);
      toast.error("Failed to delete election");
    }
  };

  const handleActivateElection = async (election) => {
    // Check if election has expired
    const now = new Date();
    const endDate = new Date(election.end_time);
    
    if (endDate < now) {
      toast.error("Cannot activate an expired election. The end date has passed.");
      return;
    }

    try {
      const { count, error: positionCheck } = await supabase
        .from("positions")
        .select("*", { count: "exact", head: true })
        .eq("election_id", election.id);

      if (positionCheck) throw positionCheck;

      if (!count || count === 0) {
        toast.error(
          "Cannot activate election without positions. Add positions first.",
        );
        return;
      }

      await supabase
        .from("elections")
        .update({ is_active: false })
        .neq("id", election.id);

      const { error } = await supabase
        .from("elections")
        .update({ is_active: true })
        .eq("id", election.id);

      if (error) throw error;

      toast.success(`${election.title} is now active!`);
      fetchElections();
    } catch (error) {
      console.error("Error activating election:", error);
      toast.error("Failed to activate election");
    }
  };

  const handleDeactivateElection = async (election) => {
    try {
      const { error } = await supabase
        .from("elections")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", election.id);

      if (error) throw error;

      toast.success(`${election.title} has been deactivated`);
      fetchElections();
    } catch (error) {
      console.error("Error deactivating election:", error);
      toast.error(`Failed to deactivate election: ${error.message}`);
    }
  };

  const resetForm = () => {
    const now = new Date();
    const defaultStart = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 7);

    setFormData({
      title: "",
      description: "",
      voting_period_id: "",
      start_date: defaultStart.toISOString().split("T")[0],
      start_time: "08:00",
      end_date: defaultEnd.toISOString().split("T")[0],
      end_time: "17:00",
      election_year: new Date().getFullYear(),
      is_active: false,
      is_archived: false,
    });
    setFormErrors({});
  };

  const editElection = (election) => {
    const startDate = new Date(election.start_time);
    const endDate = new Date(election.end_time);

    setEditingElection(election);
    setFormData({
      title: election.title,
      description: election.description || "",
      voting_period_id: election.voting_period_id,
      start_date: startDate.toISOString().split("T")[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split("T")[0],
      end_time: endDate.toTimeString().slice(0, 5),
      election_year: election.election_year,
      is_active: election.is_active || false,
      is_archived: election.is_archived || false,
    });
    setShowAddModal(true);
  };

  const exportToExcel = () => {
    const exportData = filteredElections.map((election) => {
      const status = getElectionStatus(election);
      return {
        Title: election.title,
        Year: election.election_year,
        "Voting Period": election.voting_periods?.title || "N/A",
        "Start Date": new Date(election.start_time).toLocaleString(),
        "End Date": new Date(election.end_time).toLocaleString(),
        "Positions Count": election.positions?.[0]?.count || 0,
        Status: status.label,
        "Has Expired": new Date(election.end_time) < new Date() ? "Yes" : "No",
        Description: election.description || "N/A",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Elections");
    XLSX.writeFile(
      wb,
      `elections_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Export successful!");
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "Invalid Date";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getElectionStatus = (election) => {
    const now = new Date();
    const start = new Date(election.start_time);
    const end = new Date(election.end_time);
    const hasExpired = end < now;

    // Check if election has expired (end date passed)
    if (hasExpired && election.is_active) {
      return {
        label: "Expired",
        color: "bg-red-500/20 text-red-400",
        icon: FaTimesCircle,
        description: "This election has passed its end date",
      };
    }

    if (election.is_active) {
      if (now < start) {
        return {
          label: "Upcoming",
          color: "bg-blue-500/20 text-blue-400",
          icon: FaClock,
          description: "Scheduled to start soon",
        };
      }
      if (now >= start && now <= end) {
        return {
          label: "Active",
          color: "bg-green-500/20 text-green-400",
          icon: FaPlay,
          description: "Currently ongoing",
        };
      }
      if (now > end) {
        return {
          label: "Expired",
          color: "bg-red-500/20 text-red-400",
          icon: FaTimesCircle,
          description: "End date has passed",
        };
      }
    }
    
    if (now > end) {
      return {
        label: "Completed",
        color: "bg-gray-500/20 text-gray-400",
        icon: FaCheckCircle,
        description: "Voting has ended",
      };
    }
    
    if (now < start) {
      return {
        label: "Upcoming",
        color: "bg-blue-500/20 text-blue-400",
        icon: FaClock,
        description: `Starts ${start.toLocaleDateString()}`,
      };
    }
    
    return {
      label: "Inactive",
      color: "bg-yellow-500/20 text-yellow-400",
      icon: FaHourglassHalf,
      description: "Not currently active",
    };
  };

  const isElectionExpired = (endTime) => {
    return new Date(endTime) < new Date();
  };

  useEffect(() => {
    let filtered = [...elections];
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.election_year?.toString().includes(searchTerm),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => {
        const status = getElectionStatus(e);
        return status.label.toLowerCase() === statusFilter;
      });
    }
    setFilteredElections(filtered);
  }, [searchTerm, statusFilter, elections]);

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === "light" ? "bg-gray-50" : "bg-gradient-to-br from-gray-900 to-gray-800"
      }`}>
        <Toaster position="top-center" richColors />
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === "light" ? "text-gray-600" : "text-white"}>
            Loading elections...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === "light" ? "bg-gray-50" : "bg-gradient-to-br from-gray-900 to-gray-800"
    }`}>
      <Toaster position="top-center" richColors closeButton />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: theme === "light" ? "#0f766e" : "#fbbf24",
          color: theme === "light" ? "#ffffff" : "#1f2937",
        }}
      >
        {theme === "light" ? <FaMoon size={20} /> : <FaSun size={20} />}
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${
            theme === "light" ? "text-gray-900" : "text-white"
          }`}>
            Manage Elections
          </h1>
          <p className={`mt-2 ${
            theme === "light" ? "text-gray-600" : "text-gray-300"
          }`}>
            Create elections, manage positions, and oversee voting periods
          </p>
          <p className="text-teal-600 dark:text-teal-400 text-sm mt-1">
            Logged in as: {admin?.email}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className={`rounded-xl p-4 border ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-white/10 backdrop-blur-lg border-white/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-white/70"
                }`}>Total Elections</p>
                <p className={`text-2xl font-bold mt-1 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}>{stats.total}</p>
              </div>
              <FaUniversity className={`text-2xl ${
                theme === "light" ? "text-teal-500" : "text-blue-400"
              }`} />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-white/10 backdrop-blur-lg border-white/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-white/70"
                }`}>Active</p>
                <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                  {stats.active}
                </p>
              </div>
              <FaPlay className="text-2xl text-green-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-white/10 backdrop-blur-lg border-white/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-white/70"
                }`}>Upcoming</p>
                <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {stats.upcoming}
                </p>
              </div>
              <FaClock className="text-2xl text-blue-500" />
            </div>
          </div>
          
          <div className={`rounded-xl p-4 border ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-white/10 backdrop-blur-lg border-white/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-white/70"
                }`}>Completed</p>
                <p className="text-2xl font-bold mt-1 text-gray-600 dark:text-gray-400">
                  {stats.completed}
                </p>
              </div>
              <FaCheckCircle className="text-2xl text-gray-500" />
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${
            theme === "light"
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-white/10 backdrop-blur-lg border-white/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs ${
                  theme === "light" ? "text-gray-500" : "text-white/70"
                }`}>Expired</p>
                <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                  {stats.expired}
                </p>
              </div>
              <FaTimesCircle className="text-2xl text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-6 ${
          theme === "light"
            ? "bg-white border-gray-200 shadow-sm"
            : "bg-white/10 backdrop-blur-lg border-white/20"
        }`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  theme === "light" ? "text-gray-400" : "text-gray-500"
                }`} />
                <input
                  type="text"
                  placeholder="Search by title or year..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                      : "bg-white/5 border-white/20 text-white placeholder-gray-400"
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "light"
                    ? "bg-white border-gray-300 text-gray-900"
                    : "bg-white/5 border-white/20 text-white"
                }`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
              <button
                onClick={() => {
                  resetForm();
                  setEditingElection(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
              >
                <FaPlus /> Create Election
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition"
              >
                <FaFileExcel /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Elections Table */}
        <div className={`rounded-xl border overflow-hidden ${
          theme === "light"
            ? "bg-white border-gray-200 shadow-sm"
            : "bg-white/10 backdrop-blur-lg border-white/20"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className={`border-b ${
                theme === "light" ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10"
              }`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Election Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Voting Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Positions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Date Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === "light" ? "divide-gray-100" : "divide-white/10"
              }`}>
                {filteredElections.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No elections found
                    </td>
                  </tr>
                ) : (
                  filteredElections.map((election) => {
                    const status = getElectionStatus(election);
                    const StatusIcon = status.icon;
                    const positionsCount = election.positions?.[0]?.count || 0;
                    const expired = isElectionExpired(election.end_time);
                    
                    return (
                      <tr
                        key={election.id}
                        className={`transition ${
                          theme === "light" ? "hover:bg-gray-50" : "hover:bg-white/5"
                        } ${expired && !election.is_active ? "opacity-75" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <div className={`font-medium ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}>
                            {election.title}
                          </div>
                          {election.description && (
                            <div className={`text-xs truncate max-w-[250px] mt-1 ${
                              theme === "light" ? "text-gray-500" : "text-gray-400"
                            }`}>
                              {election.description}
                            </div>
                          )}
                          {expired && (
                            <span className="inline-block mt-1 text-xs text-red-500">
                              ⚠️ Expired
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${
                            theme === "light" ? "text-gray-600" : "text-gray-300"
                          }`}>
                            {election.voting_periods?.title || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}>
                            {election.election_year}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleManagePositions(election)}
                            className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 transition text-sm"
                          >
                            <FaLayerGroup /> {positionsCount} Positions
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-xs ${
                            theme === "light" ? "text-gray-600" : "text-gray-400"
                          }`}>
                            <div>{formatDateTime(election.start_time)}</div>
                            <div>to</div>
                            <div>{formatDateTime(election.end_time)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}
                            title={status.description}
                          >
                            <StatusIcon className="text-xs" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleManagePositions(election)}
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-500 transition"
                              title="Manage Positions"
                            >
                              <FaLayerGroup />
                            </button>
                            {!election.is_active && !expired && (
                              <button
                                onClick={() => handleActivateElection(election)}
                                className="text-green-600 dark:text-green-400 hover:text-green-500 transition"
                                title="Activate election"
                              >
                                <FaPlay />
                              </button>
                            )}
                            {election.is_active && (
                              <button
                                onClick={() => handleDeactivateElection(election)}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 transition"
                                title="Deactivate election"
                              >
                                <FaStop />
                              </button>
                            )}
                            <button
                              onClick={() => editElection(election)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 transition"
                              title="Edit election"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => confirmDeleteElection(election)}
                              className="text-red-600 dark:text-red-400 hover:text-red-500 transition"
                              title="Delete election"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Election Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            theme === "light" ? "bg-white" : "bg-gray-800"
          }`}>
            <div className={`flex justify-between items-center p-6 border-b ${
              theme === "light" ? "border-gray-200" : "border-white/10"
            }`}>
              <h2 className={`text-2xl font-bold ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}>
                {editingElection ? "Edit Election" : "Create New Election"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingElection(null);
                  resetForm();
                }}
                className={`transition ${
                  theme === "light" ? "text-gray-400 hover:text-gray-600" : "text-gray-400 hover:text-white"
                }`}
              >
                <FaTimes />
              </button>
            </div>
            <form
              onSubmit={editingElection ? handleUpdateElection : handleAddElection}
              className="p-6 space-y-5"
            >
              <div>
                <label className={`block mb-2 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}>
                  Election Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-700 border-gray-600 text-white"
                  }`}
                  placeholder="Student Government Elections 2025"
                  required
                />
                {formErrors.title && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>
                )}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}>
                  Voting Period *
                </label>
                <select
                  value={formData.voting_period_id}
                  onChange={(e) => setFormData({ ...formData, voting_period_id: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-700 border-gray-600 text-white"
                  }`}
                  required
                >
                  <option value="">Select a voting period...</option>
                  {votingPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.title} ({new Date(period.start_date).toLocaleDateString()} -{" "}
                      {new Date(period.end_date).toLocaleDateString()})
                      {period.is_active && " - ACTIVE"}
                    </option>
                  ))}
                </select>
                {formErrors.voting_period_id && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.voting_period_id}</p>
                )}
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300 text-gray-900"
                      : "bg-gray-700 border-gray-600 text-white"
                  }`}
                  placeholder="Brief description of this election..."
                />
              </div>
              
              <div>
                <label className={`block mb-2 ${
                  theme === "light" ? "text-gray-700" : "text-gray-300"
                }`}>
                  Election Year *
                </label>
                <div className="relative">
                  <FaCalendarAlt className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === "light" ? "text-gray-400" : "text-gray-500"
                  }`} />
                  <input
                    type="number"
                    value={formData.election_year}
                    onChange={(e) => setFormData({ ...formData, election_year: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-white"
                    }`}
                    placeholder="2025"
                    min="2000"
                    max="2100"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-white"
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className={`block mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-white"
                    }`}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-white"
                    }`}
                    required
                  />
                  {formErrors.end_date && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.end_date}</p>
                  )}
                </div>
                <div>
                  <label className={`block mb-2 ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-900"
                        : "bg-gray-700 border-gray-600 text-white"
                    }`}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600"
                />
                <label htmlFor="is_active" className={theme === "light" ? "text-gray-700" : "text-gray-300"}>
                  Activate this election immediately
                </label>
              </div>
              
              {formData.is_active && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                    ⚠️ Activating this election will deactivate any currently active election.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingElection(null);
                    resetForm();
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    theme === "light"
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50"
                >
                  {submitting ? <FaSpinner className="animate-spin mx-auto" /> : editingElection ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Positions Modal */}
      {showPositionsModal && selectedElection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto ${
            theme === "light" ? "bg-white" : "bg-gray-800"
          }`}>
            <div className={`flex justify-between items-center p-6 border-b ${
              theme === "light" ? "border-gray-200" : "border-white/10"
            }`}>
              <div>
                <h2 className={`text-2xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}>
                  Manage Positions
                </h2>
                <p className={`text-sm mt-1 ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}>
                  {selectedElection.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPositionsModal(false);
                  setSelectedElection(null);
                  setPositions([]);
                  setEditingPosition(null);
                }}
                className={`transition ${
                  theme === "light" ? "text-gray-400 hover:text-gray-600" : "text-gray-400 hover:text-white"
                }`}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6">
              <div className={`rounded-lg p-4 mb-6 ${
                theme === "light" ? "bg-gray-50" : "bg-white/5"
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}>
                  {editingPosition ? "Edit Position" : "Add New Position"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}>
                      Position Title *
                    </label>
                    <input
                      type="text"
                      value={positionForm.title}
                      onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "light"
                          ? "bg-white border-gray-300 text-gray-900"
                          : "bg-gray-700 border-gray-600 text-white"
                      }`}
                      placeholder="President"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}>
                      Order Number
                    </label>
                    <input
                      type="number"
                      value={positionForm.order_number}
                      onChange={(e) => setPositionForm({ ...positionForm, order_number: parseInt(e.target.value) })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "light"
                          ? "bg-white border-gray-300 text-gray-900"
                          : "bg-gray-700 border-gray-600 text-white"
                      }`}
                      placeholder="1, 2, 3..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-sm mb-2 ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}>
                      Description
                    </label>
                    <textarea
                      value={positionForm.description}
                      onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                      rows={2}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        theme === "light"
                          ? "bg-white border-gray-300 text-gray-900"
                          : "bg-gray-700 border-gray-600 text-white"
                      }`}
                      placeholder="Brief description of this position..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  {editingPosition && (
                    <button
                      onClick={() => {
                        setEditingPosition(null);
                        setPositionForm({ title: "", description: "", order_number: 999, max_votes: 1 });
                      }}
                      className={`px-4 py-2 rounded-lg transition ${
                        theme === "light"
                          ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : "bg-gray-700 hover:bg-gray-600 text-white"
                      }`}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    onClick={editingPosition ? handleUpdatePosition : handleAddPosition}
                    disabled={submitting}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition disabled:opacity-50"
                  >
                    {submitting ? <FaSpinner className="animate-spin" /> : editingPosition ? "Update" : "Add"}
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}>
                  Current Positions
                </h3>
                {positions.length === 0 ? (
                  <div className={`text-center py-8 ${
                    theme === "light" ? "text-gray-500" : "text-gray-400"
                  }`}>
                    No positions added yet. Add your first position above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {positions.map((position, idx) => (
                      <div
                        key={position.id}
                        className={`rounded-lg p-4 flex items-start justify-between ${
                          theme === "light" ? "bg-gray-50" : "bg-white/5"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm ${
                              theme === "light" ? "text-gray-500" : "text-gray-400"
                            }`}>
                              #{position.order_number || idx + 1}
                            </span>
                            <h4 className={`font-medium ${
                              theme === "light" ? "text-gray-900" : "text-white"
                            }`}>
                              {position.title}
                            </h4>
                          </div>
                          {position.description && (
                            <p className={`text-sm mt-1 ${
                              theme === "light" ? "text-gray-500" : "text-gray-400"
                            }`}>
                              {position.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editPosition(position)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 transition"
                            title="Edit position"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeletePosition(position.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-500 transition"
                            title="Delete position"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={() => {
                    setShowPositionsModal(false);
                    fetchElections();
                  }}
                  className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}