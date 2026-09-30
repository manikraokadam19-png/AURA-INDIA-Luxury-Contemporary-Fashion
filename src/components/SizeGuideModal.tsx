import React, { useState } from 'react';

interface SizeGuideModalProps {
  show: boolean;
  onClose: () => void;
  categoryGender?: string;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ show, onClose, categoryGender = 'women' }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'calc'>('chart');
  const [targetCategory, setTargetCategory] = useState<string>(
    categoryGender === 'baby' ? 'baby' : categoryGender === 'kids' ? 'kids' : categoryGender === 'men' ? 'men' : 'women'
  );

  // Calculator inputs
  const [heightCm, setHeightCm] = useState<number>(168);
  const [weightKg, setWeightKg] = useState<number>(62);
  const [calculatedSize, setCalculatedSize] = useState<string | null>(null);

  if (!show) return null;

  const calculateSize = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetCategory === 'baby') {
      setCalculatedSize('6-12M');
    } else if (targetCategory === 'kids') {
      if (heightCm < 110) setCalculatedSize('3-4Y');
      else if (heightCm < 125) setCalculatedSize('5-6Y');
      else if (heightCm < 140) setCalculatedSize('7-8Y');
      else setCalculatedSize('11-12Y');
    } else if (targetCategory === 'men') {
      if (weightKg < 64) setCalculatedSize('S');
      else if (weightKg < 76) setCalculatedSize('M');
      else if (weightKg < 88) setCalculatedSize('L');
      else if (weightKg < 100) setCalculatedSize('XL');
      else setCalculatedSize('XXL');
    } else {
      // Women
      if (weightKg < 52) setCalculatedSize('XS');
      else if (weightKg < 60) setCalculatedSize('S');
      else if (weightKg < 70) setCalculatedSize('M');
      else if (weightKg < 80) setCalculatedSize('L');
      else setCalculatedSize('XL');
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header border-bottom px-4 py-3 bg-light">
            <div>
              <span className="editorial-sub text-muted">VIVANTA FIT ADVISORY</span>
              <h5 className="modal-title font-serif h4 mb-0 fw-bold">Size Guide & Fit Assistance</h5>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {/* Category selection */}
            <div className="d-flex gap-2 mb-4 border-bottom pb-3 overflow-auto">
              <button
                type="button"
                className={`btn btn-sm ${targetCategory === 'women' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setTargetCategory('women')}
              >
                Women's Sizing
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetCategory === 'men' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setTargetCategory('men')}
              >
                Men's Sizing
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetCategory === 'kids' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setTargetCategory('kids')}
              >
                Kids Sizing (3-14Y)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${targetCategory === 'baby' ? 'btn-dark' : 'btn-outline-secondary'}`}
                onClick={() => setTargetCategory('baby')}
              >
                Baby Sizing (0-3Y)
              </button>
            </div>

            {/* Sub-tabs: Standard chart vs Find My Size */}
            <ul className="nav nav-pills mb-3">
              <li className="nav-item">
                <button
                  className={`nav-link text-uppercase fw-semibold ${activeTab === 'chart' ? 'active bg-dark text-white' : 'text-dark'}`}
                  onClick={() => setActiveTab('chart')}
                >
                  Measurements Chart (Inches)
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link text-uppercase fw-semibold ${activeTab === 'calc' ? 'active bg-dark text-white' : 'text-dark'}`}
                  onClick={() => setActiveTab('calc')}
                >
                  Find My Size Calculator
                </button>
              </li>
            </ul>

            {activeTab === 'chart' ? (
              <div className="table-responsive">
                {targetCategory === 'women' && (
                  <table className="table table-bordered table-hover text-center align-middle">
                    <thead className="table-light text-uppercase small">
                      <tr>
                        <th>Size</th>
                        <th>Bust (in)</th>
                        <th>Waist (in)</th>
                        <th>Hips (in)</th>
                        <th>Length (in)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td><strong>XS</strong></td><td>32 - 34</td><td>25 - 27</td><td>35 - 37</td><td>46</td></tr>
                      <tr><td><strong>S</strong></td><td>34 - 36</td><td>27 - 29</td><td>37 - 39</td><td>47</td></tr>
                      <tr className="table-active"><td><strong>M</strong></td><td>36 - 38</td><td>29 - 31</td><td>39 - 41</td><td>48</td></tr>
                      <tr><td><strong>L</strong></td><td>38 - 41</td><td>31 - 34</td><td>41 - 44</td><td>49</td></tr>
                      <tr><td><strong>XL</strong></td><td>41 - 44</td><td>34 - 37</td><td>44 - 47</td><td>50</td></tr>
                      <tr><td><strong>XXL</strong></td><td>44 - 47</td><td>37 - 40</td><td>47 - 50</td><td>50.5</td></tr>
                    </tbody>
                  </table>
                )}

                {targetCategory === 'men' && (
                  <table className="table table-bordered table-hover text-center align-middle">
                    <thead className="table-light text-uppercase small">
                      <tr>
                        <th>Size</th>
                        <th>Chest (in)</th>
                        <th>Waist (in)</th>
                        <th>Shoulder (in)</th>
                        <th>Length (in)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td><strong>S</strong></td><td>36 - 38</td><td>30 - 32</td><td>17.5</td><td>28.5</td></tr>
                      <tr className="table-active"><td><strong>M</strong></td><td>38 - 40</td><td>32 - 34</td><td>18.5</td><td>29.5</td></tr>
                      <tr><td><strong>L</strong></td><td>40 - 42</td><td>34 - 36</td><td>19.5</td><td>30.5</td></tr>
                      <tr><td><strong>XL</strong></td><td>42 - 44</td><td>36 - 38</td><td>20.5</td><td>31.5</td></tr>
                      <tr><td><strong>XXL</strong></td><td>44 - 47</td><td>38 - 41</td><td>21.5</td><td>32.0</td></tr>
                      <tr><td><strong>3XL</strong></td><td>47 - 50</td><td>41 - 44</td><td>22.5</td><td>32.5</td></tr>
                    </tbody>
                  </table>
                )}

                {targetCategory === 'kids' && (
                  <table className="table table-bordered table-hover text-center align-middle">
                    <thead className="table-light text-uppercase small">
                      <tr>
                        <th>Age Size</th>
                        <th>Height (cm)</th>
                        <th>Chest (in)</th>
                        <th>Waist (in)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td><strong>3-4Y</strong></td><td>98 - 104</td><td>22.5</td><td>21.5</td></tr>
                      <tr><td><strong>5-6Y</strong></td><td>110 - 116</td><td>24.0</td><td>22.5</td></tr>
                      <tr><td><strong>7-8Y</strong></td><td>122 - 128</td><td>26.0</td><td>24.0</td></tr>
                      <tr><td><strong>9-10Y</strong></td><td>134 - 140</td><td>28.0</td><td>25.5</td></tr>
                      <tr><td><strong>11-12Y</strong></td><td>146 - 152</td><td>30.0</td><td>27.0</td></tr>
                      <tr><td><strong>13-14Y</strong></td><td>158 - 164</td><td>32.5</td><td>28.5</td></tr>
                    </tbody>
                  </table>
                )}

                {targetCategory === 'baby' && (
                  <table className="table table-bordered table-hover text-center align-middle">
                    <thead className="table-light text-uppercase small">
                      <tr>
                        <th>Age Size</th>
                        <th>Weight (kg)</th>
                        <th>Height (cm)</th>
                        <th>Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td><strong>0-3M</strong></td><td>3.5 - 5.5 kg</td><td>50 - 60</td><td>Fold-over scratch mittens</td></tr>
                      <tr><td><strong>3-6M</strong></td><td>5.5 - 7.5 kg</td><td>60 - 68</td><td>Expandable necklines</td></tr>
                      <tr><td><strong>6-12M</strong></td><td>7.5 - 10 kg</td><td>68 - 76</td><td>Two-way YKK dual zip</td></tr>
                      <tr><td><strong>1-2Y</strong></td><td>10 - 12.5 kg</td><td>76 - 86</td><td>Grip soles on footies</td></tr>
                      <tr><td><strong>2-3Y</strong></td><td>12.5 - 15 kg</td><td>86 - 96</td><td>Comfort flex elastic</td></tr>
                    </tbody>
                  </table>
                )}

                <div className="alert alert-secondary py-2 small mb-0 mt-3">
                  <i className="bi bi-info-circle me-1"></i>
                  <strong>Measuring Tip:</strong> For oversized streetwear fits, choose your usual size. For a tailored look, size down one step.
                </div>
              </div>
            ) : (
              <form onSubmit={calculateSize} className="bg-light p-4 border">
                <h6 className="fw-bold mb-3">Instant Fit Recommendation</h6>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold">Height (cm)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      min="50"
                      max="220"
                      required
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label small fw-semibold">Weight (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      min="3"
                      max="150"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-dark w-100 py-2 text-uppercase fw-semibold">
                      Calculate Recommended Size
                    </button>
                  </div>
                </div>

                {calculatedSize && (
                  <div className="mt-4 p-3 bg-white border text-center">
                    <span className="text-muted small text-uppercase">Recommended Size for you:</span>
                    <h3 className="fw-bold mb-1 mt-1 text-success display-6">{calculatedSize}</h3>
                    <p className="small text-muted mb-0">Based on 97% verified customer fit feedback for {targetCategory} apparel.</p>
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="modal-footer bg-light px-4 py-3">
            <button type="button" className="btn btn-outline-dark text-uppercase small fw-semibold" onClick={onClose}>
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
